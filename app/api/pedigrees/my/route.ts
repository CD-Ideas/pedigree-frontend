export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { promisify } from "util";
import { execFile } from "child_process";

const execFileAsync = promisify(execFile);
const DB = process.env.SQLITE_DB_PATH || "/home/ubuntu/apbt-scraper/apbt_v2.db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userIdStr = url.searchParams.get("userId");
  const userId = userIdStr ? parseInt(userIdStr, 10) : null;

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const script = `
import sqlite3, json

db = sqlite3.connect("${DB}")
db.row_factory = sqlite3.Row
cur = db.cursor()
cur.execute("""
    SELECT id, name, prefix, suffix_wins, suffix_losses, suffix_draws, suffix_honors,
           dob, sex, color, continent, country, breeder, owner, conditioned_weight,
           photo_path, view_count, date_posted, last_modified, journal_json
    FROM published_pedigrees
    WHERE user_id = ?
    ORDER BY date_posted DESC
""", (${userId},))
rows = [dict(r) for r in cur.fetchall()]
print(json.dumps(rows))
db.close()
`;

    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 15000 });
    const data = JSON.parse(stdout.trim());
    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("My pedigrees error:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
