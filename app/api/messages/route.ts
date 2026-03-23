export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

// GET /api/messages?userId=1&folder=inbox|sent|threads
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    const folder = req.nextUrl.searchParams.get("folder") || "inbox";
    const threadId = req.nextUrl.searchParams.get("threadId");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const script = `
import sqlite3, json, sys
user_id = int(sys.argv[1])
folder = sys.argv[2]
thread_id = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "null" else None
conn = sqlite3.connect("${DB_PATH}")
conn.row_factory = sqlite3.Row

if thread_id:
    # Get all messages in a thread
    rows = conn.execute("""
        SELECT m.*,
            uf.username as from_username,
            ut.username as to_username
        FROM messages m
        LEFT JOIN users uf ON m.from_user_id = uf.id
        LEFT JOIN users ut ON m.to_user_id = ut.id
        WHERE m.thread_id = ? AND (m.from_user_id = ? OR m.to_user_id = ?)
        ORDER BY m.created_at ASC
    """, (thread_id, user_id, user_id)).fetchall()
    # Mark all as read
    conn.execute("UPDATE messages SET is_read = 1 WHERE thread_id = ? AND to_user_id = ? AND is_read = 0", (thread_id, user_id))
    conn.commit()
    result = {"messages": [dict(r) for r in rows]}
elif folder == "threads":
    # Get conversation threads (grouped)
    rows = conn.execute("""
        SELECT m.thread_id,
            m.body as last_body,
            m.subject,
            m.created_at as last_time,
            m.marketplace_ad_id,
            CASE WHEN m.from_user_id = ? THEN m.to_user_id ELSE m.from_user_id END as other_user_id,
            CASE WHEN m.from_user_id = ? THEN ut.username ELSE uf.username END as other_username,
            (SELECT COUNT(*) FROM messages m2 WHERE m2.thread_id = m.thread_id AND m2.to_user_id = ? AND m2.is_read = 0) as unread_count,
            (SELECT COUNT(*) FROM messages m3 WHERE m3.thread_id = m.thread_id) as msg_count
        FROM messages m
        LEFT JOIN users uf ON m.from_user_id = uf.id
        LEFT JOIN users ut ON m.to_user_id = ut.id
        WHERE (m.from_user_id = ? OR m.to_user_id = ?)
        AND m.id = (
            SELECT MAX(m4.id) FROM messages m4 WHERE m4.thread_id = m.thread_id
        )
        ORDER BY m.created_at DESC
    """, (user_id, user_id, user_id, user_id, user_id)).fetchall()
    result = {"threads": [dict(r) for r in rows]}
else:
    # Legacy: get individual messages
    if folder == "sent":
        rows = conn.execute("""
            SELECT m.*, u.username as to_username
            FROM messages m
            LEFT JOIN users u ON m.to_user_id = u.id
            WHERE m.from_user_id = ?
            ORDER BY m.created_at DESC
        """, (user_id,)).fetchall()
    else:
        rows = conn.execute("""
            SELECT m.*, u.username as from_username
            FROM messages m
            LEFT JOIN users u ON m.from_user_id = u.id
            WHERE m.to_user_id = ?
            ORDER BY m.created_at DESC
        """, (user_id,)).fetchall()
    result = {"messages": [dict(r) for r in rows]}

# Get unread count
unread = conn.execute("SELECT COUNT(*) FROM messages WHERE to_user_id = ? AND is_read = 0", (user_id,)).fetchone()[0]
result["unread"] = unread
conn.close()
print(json.dumps(result))
`;

    const { stdout } = await execFileAsync("python3", ["-c", script, userId, folder, threadId || "null"], { timeout: 10000 });
    return NextResponse.json(JSON.parse(stdout));
  } catch (e) {
    console.error("Messages GET error:", e);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

// POST /api/messages — send a message
export async function POST(req: NextRequest) {
  try {
    const { fromUserId, toUsername, subject, body, threadId, marketplaceAdId } = await req.json();
    if (!fromUserId || !toUsername || !body) {
      return NextResponse.json({ error: "fromUserId, toUsername, and body required" }, { status: 400 });
    }

    const script = `
import sqlite3, json, sys, hashlib
from_id = int(sys.argv[1])
to_username = sys.argv[2]
subject = sys.argv[3]
body = sys.argv[4]
thread_id = sys.argv[5] if sys.argv[5] != "null" else None
ad_id = int(sys.argv[6]) if sys.argv[6] != "null" else None
conn = sqlite3.connect("${DB_PATH}")
# Find recipient
recipient = conn.execute("SELECT id FROM users WHERE username = ?", (to_username,)).fetchone()
if not recipient:
    print(json.dumps({"error": "User not found"}))
else:
    to_id = recipient[0]
    if to_id == from_id:
        print(json.dumps({"error": "Cannot message yourself"}))
    else:
        # Generate thread_id if not provided
        if not thread_id:
            # Thread ID = sorted user IDs + optional ad ID
            ids = sorted([from_id, to_id])
            key = f"{ids[0]}_{ids[1]}"
            if ad_id:
                key += f"_ad{ad_id}"
            thread_id = hashlib.md5(key.encode()).hexdigest()[:16]

        conn.execute(
            "INSERT INTO messages (from_user_id, to_user_id, subject, body, thread_id, marketplace_ad_id) VALUES (?, ?, ?, ?, ?, ?)",
            (from_id, to_id, subject, body, thread_id, ad_id)
        )
        conn.commit()
        msg_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        print(json.dumps({"success": True, "id": msg_id, "thread_id": thread_id}))
conn.close()
`;

    const { stdout } = await execFileAsync("python3", [
      "-c", script, String(fromUserId), toUsername, subject || "", body,
      threadId || "null", marketplaceAdId ? String(marketplaceAdId) : "null"
    ], { timeout: 10000 });
    const data = JSON.parse(stdout);
    if (data.error) return NextResponse.json(data, { status: 400 });

    // Create notification for recipient
    try {
      const fromUser = JSON.parse(Buffer.from(
        (await execFileAsync("python3", ["-c", `
import sqlite3, json, sys
conn = sqlite3.connect("${DB_PATH}")
row = conn.execute("SELECT username FROM users WHERE id = ?", (int(sys.argv[1]),)).fetchone()
conn.close()
print(json.dumps({"username": row[0] if row else "Someone"}))
`, String(fromUserId)], { timeout: 5000 })).stdout, "utf-8").toString());

      // Find recipient user ID
      const recipientData = JSON.parse((await execFileAsync("python3", ["-c", `
import sqlite3, json, sys
conn = sqlite3.connect("${DB_PATH}")
row = conn.execute("SELECT id FROM users WHERE username = ?", (sys.argv[1],)).fetchone()
conn.close()
print(json.dumps({"id": row[0] if row else 0}))
`, toUsername], { timeout: 5000 })).stdout);

      if (recipientData.id) {
        await execFileAsync("python3", ["-c", `
import sqlite3, sys
conn = sqlite3.connect("${DB_PATH}")
conn.execute(
    "INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)",
    (int(sys.argv[1]), "message", sys.argv[2], sys.argv[3], "/messages")
)
conn.commit()
conn.close()
`, String(recipientData.id), `New message from ${fromUser.username}`, subject || body.substring(0, 100)], { timeout: 5000 });
      }
    } catch (_notifErr) {
      // Notification creation failure shouldn't block message sending
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error("Messages POST error:", e);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
