export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = process.env.SQLITE_DB_PATH || "/home/ubuntu/apbt-scraper/apbt_v2.db";

// POST — update my last_active
// GET — check another user's status
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const script = `
import sqlite3, json, sys
from datetime import datetime
conn = sqlite3.connect("${DB_PATH}")
conn.execute("UPDATE users SET last_active = ? WHERE id = ?", (datetime.utcnow().isoformat(), int(sys.argv[1])))
conn.commit()
conn.close()
print(json.dumps({"success": True}))
`;
    const { stdout } = await execFileAsync("python3", ["-c", script, String(userId)], { timeout: 5000 });
    return NextResponse.json(JSON.parse(stdout));
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const username = req.nextUrl.searchParams.get("username");
    if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });

    const script = `
import sqlite3, json, sys
from datetime import datetime, timedelta
conn = sqlite3.connect("${DB_PATH}")
row = conn.execute("SELECT last_active FROM users WHERE username = ?", (sys.argv[1],)).fetchone()
conn.close()
if row and row[0]:
    last = datetime.fromisoformat(row[0])
    now = datetime.utcnow()
    diff = (now - last).total_seconds()
    online = diff < 300  # 5 minutes
    print(json.dumps({"online": online, "last_active": row[0], "seconds_ago": int(diff)}))
else:
    print(json.dumps({"online": False, "last_active": None, "seconds_ago": None}))
`;
    const { stdout } = await execFileAsync("python3", ["-c", script, username], { timeout: 5000 });
    return NextResponse.json(JSON.parse(stdout));
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
