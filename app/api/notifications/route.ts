export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

// GET - fetch notifications for a user
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  try {
    const script = `
import sqlite3, json, sys
user_id = int(sys.argv[1])
conn = sqlite3.connect("${DB_PATH}")
conn.row_factory = sqlite3.Row
rows = conn.execute(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
    (user_id,)
).fetchall()
unread = conn.execute(
    "SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0",
    (user_id,)
).fetchone()["c"]
conn.close()
print(json.dumps({"notifications": [dict(r) for r in rows], "unread_count": unread}))
`;
    const { stdout } = await execFileAsync("python3", ["-c", script, userId], { timeout: 10000 });
    return NextResponse.json(JSON.parse(stdout));
  } catch (_e) {
    return NextResponse.json({ notifications: [], unread_count: 0 });
  }
}

// POST - create a notification or perform actions
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, notificationId, type, title, bodyText, link } = body;

    if (action === "mark_read") {
      const script = `
import sqlite3, json, sys
nid = int(sys.argv[1])
user_id = int(sys.argv[2])
conn = sqlite3.connect("${DB_PATH}")
conn.execute("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", (nid, user_id))
conn.commit()
conn.close()
print(json.dumps({"success": True}))
`;
      const { stdout } = await execFileAsync("python3", ["-c", script, String(notificationId), String(userId)], { timeout: 10000 });
      return NextResponse.json(JSON.parse(stdout));
    }

    if (action === "mark_all_read") {
      const script = `
import sqlite3, json, sys
user_id = int(sys.argv[1])
conn = sqlite3.connect("${DB_PATH}")
conn.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ?", (user_id,))
conn.commit()
conn.close()
print(json.dumps({"success": True}))
`;
      const { stdout } = await execFileAsync("python3", ["-c", script, String(userId)], { timeout: 10000 });
      return NextResponse.json(JSON.parse(stdout));
    }

    if (action === "delete") {
      const script = `
import sqlite3, json, sys
nid = int(sys.argv[1])
user_id = int(sys.argv[2])
conn = sqlite3.connect("${DB_PATH}")
conn.execute("DELETE FROM notifications WHERE id = ? AND user_id = ?", (nid, user_id))
conn.commit()
conn.close()
print(json.dumps({"success": True}))
`;
      const { stdout } = await execFileAsync("python3", ["-c", script, String(notificationId), String(userId)], { timeout: 10000 });
      return NextResponse.json(JSON.parse(stdout));
    }

    if (action === "clear_all") {
      const script = `
import sqlite3, json, sys
user_id = int(sys.argv[1])
conn = sqlite3.connect("${DB_PATH}")
conn.execute("DELETE FROM notifications WHERE user_id = ?", (user_id,))
conn.commit()
conn.close()
print(json.dumps({"success": True}))
`;
      const { stdout } = await execFileAsync("python3", ["-c", script, String(userId)], { timeout: 10000 });
      return NextResponse.json(JSON.parse(stdout));
    }

    if (action === "mark_read_by_sender") {
      const { senderName } = body;
      if (!userId || !senderName) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      const script = `
import sqlite3, json, sys
user_id = int(sys.argv[1])
sender = sys.argv[2]
conn = sqlite3.connect("${DB_PATH}")
conn.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND type = 'message' AND title LIKE '%' || ? || '%' AND is_read = 0", (user_id, sender))
conn.commit()
updated = conn.execute("SELECT changes()").fetchone()[0]
conn.close()
print(json.dumps({"success": True, "updated": updated}))
`;
      const { stdout } = await execFileAsync("python3", ["-c", script, String(userId), senderName], { timeout: 10000 });
      return NextResponse.json(JSON.parse(stdout));
    }

    if (action === "mark_read_support") {
      if (!userId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      const script = `
import sqlite3, json, sys
user_id = int(sys.argv[1])
conn = sqlite3.connect("${DB_PATH}")
conn.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND type = 'support' AND is_read = 0", (user_id,))
conn.commit()
updated = conn.execute("SELECT changes()").fetchone()[0]
conn.close()
print(json.dumps({"success": True, "updated": updated}))
`;
      const { stdout } = await execFileAsync("python3", ["-c", script, String(userId)], { timeout: 10000 });
      const result = JSON.parse(stdout);
      // Dispatch event to refresh navbar
      return NextResponse.json(result);
    }

    if (action === "create") {
      if (!userId || !type || !title) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      const script = `
import sqlite3, json, sys
user_id = int(sys.argv[1])
ntype = sys.argv[2]
ntitle = sys.argv[3]
nbody = sys.argv[4]
nlink = sys.argv[5]
conn = sqlite3.connect("${DB_PATH}")
conn.execute(
    "INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)",
    (user_id, ntype, ntitle, nbody, nlink)
)
conn.commit()
conn.close()
print(json.dumps({"success": True}))
`;
      const { stdout } = await execFileAsync("python3", ["-c", script, String(userId), type, title, bodyText || "", link || ""], { timeout: 10000 });
      return NextResponse.json(JSON.parse(stdout));
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
