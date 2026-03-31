export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { promisify } from "util";
import { execFile } from "child_process";

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
    SELECT p.id, p.name, p.prefix, p.suffix_wins, p.suffix_losses, p.suffix_draws, p.suffix_honors,
           p.dob, p.sex, p.color, p.continent, p.country, p.breeder, p.owner, p.conditioned_weight,
           p.photo_path, p.view_count, p.date_posted, p.last_modified,
           u.username as creator
    FROM published_pedigrees p
    LEFT JOIN users u ON p.user_id = u.id
    ORDER BY p.date_posted DESC
""")
rows = [dict(r) for r in cur.fetchall()]
print(json.dumps(rows))
db.close()
`;

    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 15000 });
    const data = JSON.parse(stdout.trim());
    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("Community pedigrees error:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
