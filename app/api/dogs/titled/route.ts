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

    const script = `
import sqlite3, json

conn = sqlite3.connect("${DB_PATH}")
conn.row_factory = sqlite3.Row

# Only pull from published_pedigrees where user opted in to title feed
rows = conn.execute("""
    SELECT p.id, p.name, p.prefix, p.photo_path, p.date_posted, p.user_id, u.username
    FROM published_pedigrees p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.show_in_title_feed = 1
    ORDER BY p.date_posted DESC
    LIMIT ${limit}
""").fetchall()

results = []
for r in rows:
    name = r["name"]
    prefix = r["prefix"] or ""
    full_name = f"{prefix} {name}".strip() if prefix else name

    # Determine title type from prefix
    pf = prefix.upper().strip()
    if pf in ("GR CH", "GRCH", "GR. CH.", "GRAND CHAMPION"):
        title = "Grand Champion"
        color = "blue"
    elif pf in ("CH", "CHAMPION"):
        title = "Champion"
        color = "gold"
    elif pf:
        title = pf
        color = "red"
    else:
        # Check if the name itself starts with a title
        nu = name.upper()
        if nu.startswith("GR CH") or nu.startswith("GRCH"):
            title = "Grand Champion"
            color = "blue"
        elif nu.startswith("CH "):
            title = "Champion"
            color = "gold"
        else:
            title = "Published"
            color = "gold"

    results.append({
        "id": str(r["id"]),
        "dog_id": None,
        "pedigree_id": r["id"],
        "dog": full_name,
        "title": title,
        "color": color,
        "photo_url": r["photo_path"],
        "username": r["username"],
        "date_posted": r["date_posted"],
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
