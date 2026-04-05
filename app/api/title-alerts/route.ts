export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB = process.env.SQLITE_DB_PATH || "/home/ubuntu/apbt-scraper/apbt_v2.db";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") || "0";
    const script = `
import sqlite3, json

db = sqlite3.connect("${DB}")
db.row_factory = sqlite3.Row
cur = db.cursor()
cur.execute("""
  SELECT p.id, p.name, p.prefix, p.suffix_wins, p.suffix_losses, p.breeder, p.owner, p.country, p.continent, p.sex, p.date_posted, p.photo_path, u.username as creator_username,
    CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END as is_read
  FROM published_pedigrees p
  LEFT JOIN users u ON p.user_id = u.id
  LEFT JOIN title_alert_reads r ON r.alert_id = p.id AND r.user_id = ${userId}
  WHERE p.show_in_title_feed = 1
  ORDER BY p.date_posted DESC
  LIMIT 100
""")
rows = [dict(r) for r in cur.fetchall()]
unread_count = sum(1 for r in rows if not r['is_read'])
db.close()
print(json.dumps({"alerts": rows, "unread_count": unread_count}))
`;
    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 15000 });
    return NextResponse.json(JSON.parse(stdout.trim()));
  } catch (err) {
    console.error("Title alerts error:", err);
    return NextResponse.json({ alerts: [], unread_count: 0 });
  }
}
