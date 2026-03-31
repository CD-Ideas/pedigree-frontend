export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = process.env.SQLITE_DB_PATH || "/home/ubuntu/apbt-scraper/apbt_v2.db";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return NextResponse.json({ unread: 0 });

    const script = `
import sqlite3, json, sys
user_id = int(sys.argv[1])
conn = sqlite3.connect("${DB_PATH}")
count = conn.execute("SELECT COUNT(*) FROM messages WHERE to_user_id = ? AND is_read = 0", (user_id,)).fetchone()[0]
conn.close()
print(json.dumps({"unread": count}))
`;

    const { stdout } = await execFileAsync("python3", ["-c", script, userId], { timeout: 10000 });
    return NextResponse.json(JSON.parse(stdout));
  } catch (_e) {
    return NextResponse.json({ unread: 0 });
  }
}
