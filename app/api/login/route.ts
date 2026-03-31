export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = process.env.SQLITE_DB_PATH || "/home/ubuntu/apbt-scraper/apbt_v2.db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: { message: "Username and password required" } }, { status: 400 });
    }

    const usernameB64 = Buffer.from(username).toString("base64");
    const passwordB64 = Buffer.from(password).toString("base64");

    const script = `
import sqlite3, json, hashlib, base64, os

username = base64.b64decode("${usernameB64}").decode("utf-8")
password = base64.b64decode("${passwordB64}").decode("utf-8")

conn = sqlite3.connect("${DB_PATH}")
c = conn.cursor()

# Create users table if not exists
c.execute("""CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)""")
conn.commit()

# Find user
c.execute("SELECT id, username, password_hash, salt, role, email, COALESCE(profile_picture, '') FROM users WHERE LOWER(username) = LOWER(?)", (username,))
row = c.fetchone()

if not row:
    print(json.dumps({"error": {"message": "Invalid username or password"}}))
    conn.close()
    exit()

user_id, uname, stored_hash, salt, role, email, profile_picture = row

# Verify password
check_hash = hashlib.sha256((password + salt).encode()).hexdigest()

if check_hash != stored_hash:
    print(json.dumps({"error": {"message": "Invalid username or password"}}))
    conn.close()
    exit()

# Generate simple token
import secrets
token = secrets.token_hex(32)

print(json.dumps({
    "data": {
        "accessToken": token,
        "refreshToken": secrets.token_hex(32),
        "user": {
            "id": user_id,
            "username": uname,
            "email": email,
            "role": role,
            "profile_picture": profile_picture
        }
    }
}))
conn.close()
`;

    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 10000 });
    const data = JSON.parse(stdout);

    if (data.error) {
      return NextResponse.json(data, { status: 401 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (_e) {
    return NextResponse.json({ error: { message: "Login failed" } }, { status: 500 });
  }
}
