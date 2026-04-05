export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB = process.env.SQLITE_DB_PATH || "/home/ubuntu/apbt-scraper/apbt_v2.db";

export async function GET() {
  try {
    const script = `
import sqlite3, json

db = sqlite3.connect("${DB}")
db.row_factory = sqlite3.Row
cur = db.cursor()
cur.execute("""
  SELECT id, name, prefix, suffix_wins, suffix_losses, breeder, owner, country, continent, sex, date_posted, photo_path, creator_username
  FROM published_pedigrees
  WHERE show_in_title_feed = 1
  ORDER BY date_posted DESC
  LIMIT 100
""")
rows = [dict(r) for r in cur.fetchall()]
db.close()
print(json.dumps({"alerts": rows}))
`;
    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 15000 });
    return NextResponse.json(JSON.parse(stdout.trim()));
  } catch (err) {
    console.error("Title alerts error:", err);
    return NextResponse.json({ alerts: [] });
  }
}
