export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = process.env.SQLITE_DB_PATH || "/home/ubuntu/apbt-scraper/apbt_v2.db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, email } = body;

    if (!username || !password) {
      return NextResponse.json({ success: false, message: "Username and password required" }, { status: 400 });
    }

    if (username.length < 3) {
      return NextResponse.json({ success: false, message: "Username must be at least 3 characters" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, message: "Password must be at least 6 characters" }, { status: 400 });
    }

    const usernameB64 = Buffer.from(username).toString("base64");
    const passwordB64 = Buffer.from(password).toString("base64");
    const emailB64 = Buffer.from(email || "").toString("base64");

    const script = `
import sqlite3, json, hashlib, base64, os

username = base64.b64decode("${usernameB64}").decode("utf-8")
password = base64.b64decode("${passwordB64}").decode("utf-8")
email = base64.b64decode("${emailB64}").decode("utf-8") or None

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

# Check if username exists
c.execute("SELECT id FROM users WHERE LOWER(username) = LOWER(?)", (username,))
if c.fetchone():
    print(json.dumps({"success": False, "message": "Username already taken"}))
    conn.close()
    exit()

# Hash password
salt = os.urandom(16).hex()
password_hash = hashlib.sha256((password + salt).encode()).hexdigest()

c.execute("INSERT INTO users (username, password_hash, salt, email) VALUES (?, ?, ?, ?)",
          (username, password_hash, salt, email))
conn.commit()
conn.close()

print(json.dumps({"success": True, "message": "Account created successfully"}))
`;

    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 10000 });
    const data = JSON.parse(stdout);

    if (!data.success) {
      return NextResponse.json(data, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (_e) {
    return NextResponse.json({ success: false, message: "Registration failed" }, { status: 500 });
  }
}
