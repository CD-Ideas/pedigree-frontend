export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = process.env.SQLITE_DB_PATH || "/home/ubuntu/apbt-scraper/apbt_v2.db";

// POST /api/heartbeat — update presence for members & guests
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || null;
    const sessionKey = body.sessionKey || null;

    if (!userId && !sessionKey) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const script = `
import sqlite3, sys, json
from datetime import datetime

user_id = sys.argv[1] if sys.argv[1] != "null" else None
session_key = sys.argv[2] if sys.argv[2] != "null" else None

conn = sqlite3.connect("${DB_PATH}")
now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

if user_id:
    conn.execute("UPDATE users SET last_active = ? WHERE id = ?", (now, int(user_id)))
elif session_key:
    conn.execute("""
        INSERT INTO guest_sessions (session_key, last_active) VALUES (?, ?)
        ON CONFLICT(session_key) DO UPDATE SET last_active = ?
    """, (session_key, now, now))

# Cleanup old guest sessions (older than 10 minutes)
conn.execute("DELETE FROM guest_sessions WHERE last_active < datetime('now', '-10 minutes')")

conn.commit()
conn.close()
print(json.dumps({"ok": True}))
`;

    await execFileAsync("python3", ["-c", script, userId ? String(userId) : "null", sessionKey || "null"], { timeout: 5000 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Heartbeat error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// GET /api/heartbeat — get online counts + member list
export async function GET() {
  try {
    const script = `
import sqlite3, json

conn = sqlite3.connect("${DB_PATH}")

# Members online (active in last 5 minutes, only those with show_online enabled)
members = conn.execute("""
    SELECT id, username, profile_picture FROM users
    WHERE last_active IS NOT NULL AND last_active > datetime('now', '-5 minutes')
    AND (show_online IS NULL OR show_online = 1)
""").fetchall()

# Guests online (active in last 5 minutes)
guest_count = conn.execute("""
    SELECT COUNT(*) FROM guest_sessions
    WHERE last_active > datetime('now', '-5 minutes')
""").fetchone()[0]

conn.close()

result = {
    "members_online": len(members),
    "guests_online": guest_count,
    "online_members": [{"id": m[0], "username": m[1], "profile_picture": m[2]} for m in members]
}
print(json.dumps(result))
`;

    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 5000 });
    return NextResponse.json(JSON.parse(stdout));
  } catch (e) {
    console.error("Heartbeat GET error:", e);
    return NextResponse.json({ members_online: 0, guests_online: 0, online_members: [] });
  }
}
