export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

export async function POST(req: Request) {
  try {
    const { userId, currentPassword, newPassword } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
    if (!currentPassword || !newPassword) return NextResponse.json({ error: "Both passwords required" }, { status: 400 });
    if (newPassword.length < 6) return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });

    const dataB64 = Buffer.from(JSON.stringify({ userId, currentPassword, newPassword })).toString("base64");

    const script = `
import sqlite3, json, hashlib, base64, os
data = json.loads(base64.b64decode("${dataB64}").decode("utf-8"))
conn = sqlite3.connect("${DB_PATH}")
c = conn.cursor()

c.execute("SELECT password_hash, salt FROM users WHERE id = ?", (data["userId"],))
row = c.fetchone()
if not row:
    print(json.dumps({"error": "User not found"}))
    conn.close()
    exit()

stored_hash, salt = row
check_hash = hashlib.sha256((data["currentPassword"] + salt).encode()).hexdigest()
if check_hash != stored_hash:
    print(json.dumps({"error": "Current password is incorrect"}))
    conn.close()
    exit()

new_salt = os.urandom(16).hex()
new_hash = hashlib.sha256((data["newPassword"] + new_salt).encode()).hexdigest()
c.execute("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?", (new_hash, new_salt, data["userId"]))
conn.commit()
conn.close()
print(json.dumps({"success": True}))
`;

    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 10000 });
    const data = JSON.parse(stdout);
    if (data.error) return NextResponse.json(data, { status: 400 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
