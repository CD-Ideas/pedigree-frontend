export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

export async function POST(req: Request) {
  try {
    const { userId, username, email } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
    if (!username || username.trim().length < 2) return NextResponse.json({ error: "Username must be at least 2 characters" }, { status: 400 });

    const dataB64 = Buffer.from(JSON.stringify({ userId, username: username.trim(), email: (email || "").trim() })).toString("base64");

    const script = `
import sqlite3, json, base64
data = json.loads(base64.b64decode("${dataB64}").decode("utf-8"))
conn = sqlite3.connect("${DB_PATH}")
c = conn.cursor()

# Check if username is taken by another user
c.execute("SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?", (data["username"], data["userId"]))
if c.fetchone():
    print(json.dumps({"error": "Username already taken"}))
    conn.close()
    exit()

c.execute("UPDATE users SET username = ?, email = ? WHERE id = ?", (data["username"], data["email"], data["userId"]))
conn.commit()
conn.close()
print(json.dumps({"success": True, "username": data["username"], "email": data["email"]}))
`;

    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 10000 });
    const data = JSON.parse(stdout);
    if (data.error) return NextResponse.json(data, { status: 400 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
