export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

async function queryDb(script: string): Promise<any> {
  const { stdout } = await execFileAsync("python3", ["-c", script], {
    timeout: 60000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

/* ── GET /api/spotlight?dog_id=2&from=2015&to=2025&sort=closest&limit=20 ── */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const dogId = parseInt(sp.get("dog_id") || "2", 10);
    const fromYear = parseInt(sp.get("from") || "2015", 10);
    const toYear = parseInt(sp.get("to") || "2026", 10);
    const sort = sp.get("sort") || "closest";
    const limit = Math.min(parseInt(sp.get("limit") || "20", 10), 50);

    if (isNaN(dogId)) {
      return NextResponse.json({ error: "Invalid dog_id" }, { status: 400 });
    }

    const data = await queryDb(`
import sqlite3, json, math

DB = "${DB_PATH}"
TARGET_ID = ${dogId}
FROM_YEAR = ${fromYear}
TO_YEAR = ${toYear}
SORT = "${sort}"
LIMIT = ${limit}

conn = sqlite3.connect(DB, timeout=10)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Get target dog info
cur.execute("SELECT dog_id, registered_name, photo_url, sex FROM dogs WHERE dog_id = ?", (TARGET_ID,))
target_row = cur.fetchone()
if not target_row:
    print(json.dumps({"error": "target_not_found"}))
    conn.close()
    raise SystemExit(0)

target = {"id": target_row["dog_id"], "name": target_row["registered_name"], "photo_url": target_row["photo_url"]}

# ─── Step 1: Find all dogs that have TARGET_ID as an ancestor ───
# Use pedigree_tree: find all dog_ids where ancestor_id = TARGET_ID
cur.execute("""
    SELECT DISTINCT pt.dog_id, pt.generation, pt.position
    FROM pedigree_tree pt
    WHERE pt.ancestor_id = ?
""", (TARGET_ID,))
descendants_raw = cur.fetchall()

# Build a dict: dog_id -> list of (generation, position) appearances
desc_map = {}
for r in descendants_raw:
    did = r["dog_id"]
    if did not in desc_map:
        desc_map[did] = []
    desc_map[did].append({"gen": r["generation"], "pos": r["position"]})

if not desc_map:
    print(json.dumps({"target": target, "results": [], "total": 0}))
    conn.close()
    raise SystemExit(0)

# ─── Step 2: Get dog details for all descendants, filter by year ───
dog_ids = list(desc_map.keys())

# Process in batches of 500
results = []
batch_size = 500
for i in range(0, len(dog_ids), batch_size):
    batch = dog_ids[i:i+batch_size]
    placeholders = ",".join("?" * len(batch))
    cur.execute(f"""
        SELECT dog_id, registered_name, photo_url, sex, birthdate, owner, breeder,
               registration_number, css_class, view_count, offspring_count,
               sire_id, dam_id, posted_date
        FROM dogs
        WHERE dog_id IN ({placeholders})
    """, batch)
    for row in cur.fetchall():
        d = dict(row)
        # Filter by birthdate year
        bd = d.get("birthdate") or ""
        year = None
        if bd and len(bd) >= 4:
            try:
                year = int(bd[:4])
            except:
                pass
        if year and (year < FROM_YEAR or year > TO_YEAR):
            continue
        results.append(d)

# ─── Step 3: Calculate COI-like score for each descendant ───
# "Tightest" = appears most times as ancestor (more paths = tighter breeding)
# Also factor in how close (lower generation = closer)
# Wright's COI approximation: sum of (0.5)^(n+1) for each path
# where n = generation of the common ancestor appearance

scored = []
for d in results:
    did = d["dog_id"]
    appearances = desc_map.get(did, [])

    # Number of times target appears in this dog's pedigree
    num_paths = len(appearances)

    # Closest generation (minimum)
    min_gen = min(a["gen"] for a in appearances)

    # COI contribution from this ancestor
    # Wright's formula: F = sum( (1/2)^(n_s + n_d + 1) * (1 + F_a) )
    # Simplified: each appearance at gen g contributes (0.5)^(g+1)
    coi = sum(math.pow(0.5, a["gen"] + 1) for a in appearances)

    # Blood percentage: each appearance at gen g contributes (1/2^g) * 100%
    # e.g. gen 1 = 50%, gen 2 = 25%, gen 3 = 12.5%
    # If the target appears multiple times, sum them (can exceed 50% for tight breeding)
    blood_pct = sum(math.pow(0.5, a["gen"]) * 100 for a in appearances)

    # Extract titles
    name = (d.get("registered_name") or "").upper()
    titles = []
    import re
    if re.search(r'\\bGR\\s*CH\\b', name): titles.append("GR CH")
    if re.search(r'(?:^|\\s|\\()CH\\b', name): titles.append("CH")
    if re.search(r'\\bROM\\b', name): titles.append("ROM")
    if re.search(r'\\bPOR\\b', name): titles.append("POR")
    xw = re.search(r'(\\d+)XW', name)
    if xw: titles.append(f"{xw.group(1)}XW")
    xl = re.search(r'(\\d+)XL', name)
    if xl: titles.append(f"{xl.group(1)}XL")

    # Build lineage path description
    path_desc = []
    for a in sorted(appearances, key=lambda x: x["gen"]):
        g = a["gen"]
        pos = a["pos"]
        # Convert position to readable path
        parts = pos.replace(f"G{g}_", "").split("_")
        readable = []
        for p in parts:
            if p.lower() in ("sire", "s"): readable.append("Sire")
            elif p.lower() in ("dam", "d"): readable.append("Dam")
            else: readable.append(p)
        path_desc.append({"gen": g, "path": " > ".join(readable) if readable else pos})

    # Generational label
    if min_gen == 1:
        gen_label = "Son/Daughter"
    elif min_gen == 2:
        gen_label = "Grandchild"
    elif min_gen == 3:
        gen_label = "Great-grandchild"
    else:
        gen_label = f"{min_gen-2}x great-grandchild"

    photo = d.get("photo_url")
    if photo and not photo.startswith("http"):
        photo = "https://www.apbt.online-pedigrees.com/" + photo

    scored.append({
        "id": d["dog_id"],
        "name": d["registered_name"],
        "photo_url": photo,
        "sex": d.get("sex"),
        "birthdate": d.get("birthdate"),
        "owner": d.get("owner"),
        "breeder": d.get("breeder"),
        "registration_number": d.get("registration_number"),
        "css_class": d.get("css_class"),
        "view_count": d.get("view_count") or 0,
        "offspring_count": d.get("offspring_count") or 0,
        "posted_date": d.get("posted_date"),
        "num_paths": num_paths,
        "min_gen": min_gen,
        "coi": round(coi * 100, 4),
        "blood_pct": round(blood_pct, 2),
        "titles": titles,
        "gen_label": gen_label,
        "lineage_paths": path_desc[:5],
    })

# ─── Step 4: Sort ───
if SORT == "closest":
    scored.sort(key=lambda x: (-x["coi"], x["min_gen"], -x["num_paths"]))
elif SORT == "titles":
    scored.sort(key=lambda x: (-len(x["titles"]), -x["coi"]))
elif SORT == "views":
    scored.sort(key=lambda x: (-x["view_count"], -x["coi"]))
elif SORT == "recent":
    scored.sort(key=lambda x: (x.get("posted_date") or "", -x["coi"]), reverse=True)

total = len(scored)
scored = scored[:LIMIT]

conn.close()
print(json.dumps({"target": target, "results": scored, "total": total}, default=str))
`);

    if (data.error === "target_not_found") {
      return NextResponse.json({ error: "Target dog not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Spotlight route error:", error);
    return NextResponse.json(
      { error: "Failed to run spotlight query", detail: error.message },
      { status: 500 }
    );
  }
}
