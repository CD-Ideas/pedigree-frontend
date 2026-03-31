export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = process.env.SQLITE_DB_PATH || "/home/ubuntu/apbt-scraper/apbt_v2.db";

export async function GET(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get("name") || "";
    const excludeId = req.nextUrl.searchParams.get("excludeId") || "0";

    if (!name.trim()) {
      return NextResponse.json({ exists: false, scrapedMatches: [] });
    }

    const safeExcludeId = parseInt(excludeId, 10) || 0;

    const script = `
import sqlite3, json, sys
name = sys.argv[1]
exclude_id = int(sys.argv[2])
conn = sqlite3.connect(sys.argv[3])

# Check published_pedigrees
if exclude_id > 0:
    row = conn.execute("SELECT COUNT(*) FROM published_pedigrees WHERE LOWER(name) = LOWER(?) AND id != ?", (name, exclude_id)).fetchone()
else:
    row = conn.execute("SELECT COUNT(*) FROM published_pedigrees WHERE LOWER(name) = LOWER(?)", (name,)).fetchone()
exists = row[0] > 0

# Check scraped dogs - fuzzy name match (top 5)
name_pattern = "%" + name.strip().replace(" ", "%") + "%"
scraped = conn.execute("""
    SELECT d.dog_id, d.registered_name, d.sex, d.color, d.breeder, d.owner,
           d.birthdate, d.sire_id, d.dam_id,
           s.registered_name as sire_name, m.registered_name as dam_name
    FROM dogs d
    LEFT JOIN dogs s ON s.dog_id = d.sire_id
    LEFT JOIN dogs m ON m.dog_id = d.dam_id
    WHERE d.registered_name LIKE ? COLLATE NOCASE
    ORDER BY CASE WHEN LOWER(d.registered_name) = LOWER(?) THEN 0 ELSE 1 END, d.dog_id DESC
    LIMIT 5
""", (name_pattern, name)).fetchall()

matches = []
for r in scraped:
    matches.append({
        "dog_id": r[0], "registered_name": r[1], "sex": r[2], "color": r[3],
        "breeder": r[4], "owner": r[5], "birthdate": r[6],
        "sire_id": r[7], "dam_id": r[8],
        "sire_name": r[9], "dam_name": r[10]
    })

conn.close()
print(json.dumps({"exists": exists, "scrapedMatches": matches}))
`;

    const { stdout } = await execFileAsync(
      "python3", ["-c", script, name.trim(), String(safeExcludeId), DB_PATH],
      { timeout: 15000, maxBuffer: 5 * 1024 * 1024 }
    );
    const data = JSON.parse(stdout.trim());
    return NextResponse.json(data);
  } catch (e) {
    console.error("check-duplicate error:", e);
    return NextResponse.json({ exists: false, scrapedMatches: [] });
  }
}
