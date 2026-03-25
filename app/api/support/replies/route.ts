export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

async function getUser() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("session")?.value;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// GET — get all replies for a support message
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const messageId = req.nextUrl.searchParams.get("message_id");
  if (!messageId) return NextResponse.json({ error: "Missing message_id" }, { status: 400 });

  const script = `
import sqlite3, json, sys

message_id = int(sys.argv[1])
user_id = int(sys.argv[2])

conn = sqlite3.connect("${DB_PATH}")
conn.row_factory = sqlite3.Row

# Verify this message belongs to the user
msg = conn.execute("SELECT id, name, email, subject, message, status, created_at FROM support_messages WHERE id = ? AND (email = (SELECT email FROM users WHERE id = ?) OR name = (SELECT username FROM users WHERE id = ?))", (message_id, user_id, user_id)).fetchone()

if not msg:
    print(json.dumps({"error": "Message not found"}))
    conn.close()
    sys.exit(0)

# Get all replies
replies = conn.execute("SELECT id, sender_type, sender_name, message, created_at FROM support_replies WHERE support_message_id = ? ORDER BY created_at ASC", (message_id,)).fetchall()

result = {
    "message": dict(msg),
    "replies": [dict(r) for r in replies]
}
conn.close()
print(json.dumps(result, default=str))
`;

  try {
    const { stdout } = await execFileAsync("python3", ["-c", script, messageId, String(user.id)], { timeout: 5000 });
    return NextResponse.json(JSON.parse(stdout));
  } catch (e) {
    console.error("Support replies GET error:", e);
    return NextResponse.json({ error: "Failed to fetch replies" }, { status: 500 });
  }
}

// POST — user replies to a support thread
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { message_id, message } = await req.json();
  if (!message_id || !message?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const script = `
import sqlite3, json, sys

message_id = int(sys.argv[1])
user_id = int(sys.argv[2])
username = sys.argv[3]
reply_text = sys.argv[4]

conn = sqlite3.connect("${DB_PATH}")

# Verify message belongs to user
msg = conn.execute("SELECT id FROM support_messages WHERE id = ? AND (email = (SELECT email FROM users WHERE id = ?) OR name = (SELECT username FROM users WHERE id = ?))", (message_id, user_id, user_id)).fetchone()

if not msg:
    print(json.dumps({"error": "Message not found"}))
    conn.close()
    sys.exit(0)

# Insert reply
conn.execute("INSERT INTO support_replies (support_message_id, sender_type, sender_name, message) VALUES (?, 'user', ?, ?)", (message_id, username, reply_text))

# Update status back to 'new' so admin sees it needs attention
conn.execute("UPDATE support_messages SET status = 'new' WHERE id = ?", (message_id,))

conn.commit()
conn.close()
print(json.dumps({"success": True}))
`;

  try {
    const { stdout } = await execFileAsync("python3", ["-c", script, String(message_id), String(user.id), user.username, message.trim()], { timeout: 5000 });
    return NextResponse.json(JSON.parse(stdout));
  } catch (e) {
    console.error("Support reply POST error:", e);
    return NextResponse.json({ error: "Failed to send reply" }, { status: 500 });
  }
}
