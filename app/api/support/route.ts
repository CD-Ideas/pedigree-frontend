export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

// POST — submit a support message
export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name?.trim() || !subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (message.trim().length > 5000) {
      return NextResponse.json({ error: "Message too long (max 5000 characters)" }, { status: 400 });
    }

    const script = `
import sqlite3, sys, json

name = sys.argv[1]
email = sys.argv[2]
subject = sys.argv[3]
message = sys.argv[4]

conn = sqlite3.connect("${DB_PATH}")
conn.execute(
    "INSERT INTO support_messages (name, email, subject, message) VALUES (?, ?, ?, ?)",
    (name, email, subject, message)
)
conn.commit()
conn.close()
print(json.dumps({"success": True}))
`;

    const { stdout } = await execFileAsync("python3", ["-c", script, name.trim(), email.trim(), subject.trim(), message.trim()], { timeout: 5000 });
    return NextResponse.json(JSON.parse(stdout));
  } catch (e) {
    console.error("Support POST error:", e);
    return NextResponse.json({ error: "Failed to submit message" }, { status: 500 });
  }
}

// GET — get support messages (user gets own, admin gets all)
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    const username = req.nextUrl.searchParams.get("username");
    const role = req.nextUrl.searchParams.get("role");

    if (!userId || !username) return NextResponse.json({ error: "userId and username required" }, { status: 400 });

    // Admin gets all messages, regular users get only their own
    const isAdmin = role === "admin";
    const script = isAdmin ? `
import sqlite3, json

conn = sqlite3.connect("${DB_PATH}")
conn.row_factory = sqlite3.Row
rows = conn.execute("SELECT * FROM support_messages ORDER BY created_at DESC LIMIT 100").fetchall()
result = [dict(r) for r in rows]
conn.close()
print(json.dumps(result, default=str))
` : `
import sqlite3, json, sys

user_id = int(sys.argv[1])
username = sys.argv[2]

conn = sqlite3.connect("${DB_PATH}")
conn.row_factory = sqlite3.Row
rows = conn.execute(
    "SELECT * FROM support_messages WHERE name = ? OR email = (SELECT email FROM users WHERE id = ?) ORDER BY created_at DESC LIMIT 50",
    (username, user_id)
).fetchall()
result = [dict(r) for r in rows]
conn.close()
print(json.dumps(result, default=str))
`;

    const args = isAdmin ? ["-c", script] : ["-c", script, userId, username];
    const { stdout } = await execFileAsync("python3", args, { timeout: 5000 });
    return NextResponse.json({ messages: JSON.parse(stdout) });
  } catch (e) {
    console.error("Support GET error:", e);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
