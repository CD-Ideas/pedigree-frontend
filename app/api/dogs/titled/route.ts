export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);
    const days = Math.min(parseInt(searchParams.get("days") || "7", 10), 30);

    // Get dismissed alert IDs from query param (comma-separated)
    const dismissed = searchParams.get("dismissed") || "";

    const script = `
import sqlite3, json
from datetime import datetime, timedelta

conn = sqlite3.connect("${DB_PATH}")
conn.row_factory = sqlite3.Row

cutoff = (datetime.utcnow() - timedelta(days=${days})).strftime("%Y-%m-%d %H:%M:%S")

# Find recently scraped dogs with title prefixes
rows = conn.execute("""
    SELECT dog_id, registered_name, photo_url, scraped_at, modified_date
    FROM dogs
    WHERE scraped_at >= ?
    AND (
        registered_name LIKE 'GR CH %'
        OR registered_name LIKE 'GRCH %'
        OR registered_name LIKE 'CH %'
        OR registered_name LIKE 'GR. CH.%'
        OR registered_name LIKE 'GRAND CHAMPION%'
    )
    ORDER BY scraped_at DESC
    LIMIT ${limit}
""", (cutoff,)).fetchall()

results = []
for r in rows:
    name = r["registered_name"]
    # Determine title type
    if name.upper().startswith("GR CH") or name.upper().startswith("GRCH") or name.upper().startswith("GR. CH") or name.upper().startswith("GRAND CHAMPION"):
        title = "Grand Champion"
        color = "blue"
    elif name.upper().startswith("CH "):
        title = "Champion"
        color = "gold"
    else:
        title = "Titled"
        color = "red"

    results.append({
        "id": str(r["dog_id"]),
        "dog_id": r["dog_id"],
        "dog": name,
        "title": title,
        "color": color,
        "photo_url": r["photo_url"],
        "scraped_at": r["scraped_at"],
    })

conn.close()
print(json.dumps({"alerts": results}))
`;

    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 10000 });
    const data = JSON.parse(stdout);
    return NextResponse.json(data);
  } catch (e) {
    console.error("titled dogs error:", e);
    return NextResponse.json({ alerts: [] });
  }
}
