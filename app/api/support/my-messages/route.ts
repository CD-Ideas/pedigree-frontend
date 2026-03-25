export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

// GET — fetch support messages for a specific user (by username)
export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });

  try {
    const script = `
import sqlite3, json, sys

username = sys.argv[1]
conn = sqlite3.connect("${DB_PATH}")
conn.row_factory = sqlite3.Row
rows = conn.execute(
    "SELECT id, name, email, subject, message, status, admin_reply, created_at, replied_at FROM support_messages WHERE name = ? ORDER BY created_at DESC LIMIT 50",
    (username,)
).fetchall()
conn.close()
print(json.dumps({"messages": [dict(r) for r in rows]}, default=str))
`;

    const { stdout } = await execFileAsync("python3", ["-c", script, username], { timeout: 5000 });
    return NextResponse.json(JSON.parse(stdout));
  } catch (e) {
    console.error("My support messages GET error:", e);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
