export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

export async function GET() {
  try {
    const { stdout } = await execFileAsync("python3", ["-c", `
import sqlite3, json

conn = sqlite3.connect("${DB_PATH}", timeout=5)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Pre-curated list of most famous dogs by ID + verify they exist
FAMOUS_IDS = [2, 397, 29, 26, 337, 560, 3, 4115, 308, 388, 43, 60, 51, 110, 428, 1021, 146, 9, 34, 90]

placeholders = ",".join("?" * len(FAMOUS_IDS))
cur.execute(f"""
    SELECT dog_id, registered_name, photo_url, sex, view_count
    FROM dogs WHERE dog_id IN ({placeholders})
""", FAMOUS_IDS)

dogs = []
for r in cur.fetchall():
    d = dict(r)
    photo = d.get("photo_url")
    if photo and not photo.startswith("http"):
        photo = "https://www.apbt.online-pedigrees.com/" + photo
    dogs.append({
        "id": d["dog_id"],
        "name": d["registered_name"],
        "photo_url": photo,
        "view_count": d.get("view_count") or 0,
    })

# Sort by view_count desc
dogs.sort(key=lambda x: -x["view_count"])
conn.close()
print(json.dumps(dogs, default=str))
`], { timeout: 10000 });

    return NextResponse.json(JSON.parse(stdout));
  } catch (error: any) {
    console.error("Famous dogs error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
