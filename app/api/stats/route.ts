export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = process.env.SQLITE_DB_PATH || "/home/ubuntu/apbt-scraper/apbt_v2.db";

async function queryDb(script: string): Promise<any> {
  const { stdout } = await execFileAsync("python3", ["-c", script], {
    timeout: 15000,
  });
  return JSON.parse(stdout);
}

export async function GET(req: NextRequest) {
  try {
    const data = await queryDb(`
import sqlite3, json

conn = sqlite3.connect("${DB_PATH}", timeout=5)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM dogs")
total = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM dogs WHERE sire_id IS NOT NULL")
with_sire = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM dogs WHERE dam_id IS NOT NULL")
with_dam = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM dogs WHERE photo_url IS NOT NULL AND photo_url != ''")
with_photo = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM dogs WHERE birthdate IS NOT NULL AND birthdate != ''")
with_dob = cur.fetchone()[0]

cur.execute("""
  SELECT dog_id, registered_name, sex, color, registration_number
  FROM dogs ORDER BY dog_id DESC LIMIT 10
""")
recent = [
  {
    "id": r["dog_id"],
    "name": r["registered_name"],
    "sex": r["sex"],
    "color": r["color"],
    "reg_number": r["registration_number"]
  }
  for r in cur.fetchall()
]

conn.close()

print(json.dumps({
  "total": total,
  "withSire": with_sire,
  "withDam": with_dam,
  "withPhoto": with_photo,
  "withDob": with_dob,
  "breeds": [{"breed": "APBT", "count": total}],
  "recentDogs": recent
}))
`);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Stats route error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats", detail: error.message },
      { status: 500 }
    );
  }
}
