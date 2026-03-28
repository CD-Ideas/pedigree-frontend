export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

async function queryDb(script: string): Promise<any> {
  const { stdout } = await execFileAsync("python3", ["-c", script], {
    timeout: 120000,
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
import sqlite3, json, math, re
from collections import defaultdict

DB = "${DB_PATH}"
TARGET_ID = ${dogId}
FROM_YEAR = ${fromYear}
TO_YEAR = ${toYear}
SORT = "${sort}"
LIMIT = ${limit}

conn = sqlite3.connect(DB, timeout=15)
cur = conn.cursor()

# Get target dog info
cur.execute("SELECT dog_id, registered_name, photo_url, sex FROM dogs WHERE dog_id = ?", (TARGET_ID,))
target_row = cur.fetchone()
if not target_row:
    print(json.dumps({"error": "target_not_found"}))
    conn.close()
    raise SystemExit(0)

target = {"id": target_row[0], "name": target_row[1], "photo_url": target_row[2]}

# Step 1: Get all pedigree entries for this ancestor (fast with index)
cur.execute("SELECT dog_id, generation, position FROM pedigree_tree WHERE ancestor_id = ?", (TARGET_ID,))
entries = cur.fetchall()

if not entries:
    print(json.dumps({"target": target, "results": [], "total": 0}))
    conn.close()
    raise SystemExit(0)

# Step 2: Group by dog_id, calculate scores in Python (no JOIN needed)
dog_entries = defaultdict(list)
for dog_id, gen, pos in entries:
    dog_entries[dog_id].append((gen, pos))

scored_raw = []
pow_cache = {g: 0.5 ** (g + 1) for g in range(1, 20)}
bld_cache = {g: (0.5 ** g) * 100 for g in range(1, 20)}
for did, appearances in dog_entries.items():
    coi = sum(pow_cache.get(g, 0.5 ** (g + 1)) for g, p in appearances)
    min_gen = min(g for g, p in appearances)
    num_paths = len(appearances)
    blood_pct = sum(bld_cache.get(g, (0.5 ** g) * 100) for g, p in appearances)
    scored_raw.append((did, coi, min_gen, num_paths, blood_pct, appearances))

# Sort
if SORT == "closest":
    scored_raw.sort(key=lambda x: (-x[1], x[2], -x[3]))
elif SORT == "titles":
    scored_raw.sort(key=lambda x: (-x[1],))  # pre-sort by COI, re-sort after fetching details
elif SORT == "views":
    scored_raw.sort(key=lambda x: (-x[1],))
elif SORT == "recent":
    scored_raw.sort(key=lambda x: (-x[1],))

total = len(scored_raw)

# For title/views/recent sort, we need more candidates to re-sort after fetching details
fetch_limit = min(LIMIT * 5, total) if SORT in ("titles", "views", "recent") else LIMIT
top_candidates = scored_raw[:fetch_limit]
top_ids = [s[0] for s in top_candidates]

# Step 3: Fetch dog details only for top candidates
if top_ids:
    placeholders = ",".join("?" * len(top_ids))
    cur.execute(f"SELECT dog_id, registered_name, photo_url, sex, birthdate, owner, breeder, registration_number, css_class, view_count, offspring_count, posted_date FROM dogs WHERE dog_id IN ({placeholders})", top_ids)
    details = {r[0]: r for r in cur.fetchall()}
else:
    details = {}

conn.close()

# Step 4: Build results with details
scored = []
for did, coi, min_gen, num_paths, blood_pct, appearances in top_candidates:
    if did not in details:
        continue
    d = details[did]
    # d = (dog_id, registered_name, photo_url, sex, birthdate, owner, breeder, registration_number, css_class, view_count, offspring_count, posted_date)

    # Year filter
    bd = d[4] or ""
    if bd and len(bd) >= 4:
        try:
            yr = int(bd[:4])
            if yr < FROM_YEAR or yr > TO_YEAR:
                continue
        except:
            pass

    name = (d[1] or "").upper()
    titles = []
    if re.search(r'\\bGR\\s*CH\\b', name): titles.append("GR CH")
    if re.search(r'(?:^|\\s|\\()CH\\b', name): titles.append("CH")
    if re.search(r'\\bROM\\b', name): titles.append("ROM")
    if re.search(r'\\bPOR\\b', name): titles.append("POR")
    xw = re.search(r'(\\d+)XW', name)
    if xw: titles.append(f"{xw.group(1)}XW")
    xl = re.search(r'(\\d+)XL', name)
    if xl: titles.append(f"{xl.group(1)}XL")

    path_desc = []
    for g, pos in sorted(appearances, key=lambda x: x[0])[:5]:
        parts = pos.replace(f"G{g}_", "").split("_")
        readable = []
        for p in parts:
            if p.lower() in ("sire", "s"): readable.append("Sire")
            elif p.lower() in ("dam", "d"): readable.append("Dam")
            else: readable.append(p)
        path_desc.append({"gen": g, "path": " > ".join(readable) if readable else pos})

    if min_gen == 1: gen_label = "Son/Daughter"
    elif min_gen == 2: gen_label = "Grandchild"
    elif min_gen == 3: gen_label = "Great-grandchild"
    else: gen_label = f"{min_gen-2}x great-grandchild"

    photo = d[2]
    if photo and not photo.startswith("http"):
        photo = "https://www.apbt.online-pedigrees.com/" + photo

    scored.append({
        "id": did,
        "name": d[1],
        "photo_url": photo,
        "sex": d[3],
        "birthdate": d[4],
        "owner": d[5],
        "breeder": d[6],
        "registration_number": d[7],
        "css_class": d[8],
        "view_count": d[9] or 0,
        "offspring_count": d[10] or 0,
        "posted_date": d[11],
        "num_paths": num_paths,
        "min_gen": min_gen,
        "coi": round(coi * 100, 4),
        "blood_pct": round(blood_pct, 2),
        "titles": titles,
        "gen_label": gen_label,
        "lineage_paths": path_desc,
    })

# Re-sort if needed
if SORT == "titles":
    scored.sort(key=lambda x: (-len(x["titles"]), -x["coi"]))
elif SORT == "views":
    scored.sort(key=lambda x: (-x["view_count"], -x["coi"]))
elif SORT == "recent":
    scored.sort(key=lambda x: (x.get("posted_date") or "", -x["coi"]), reverse=True)

scored = scored[:LIMIT]

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
