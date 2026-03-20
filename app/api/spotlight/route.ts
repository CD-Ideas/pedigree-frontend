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
import sqlite3, json, math, re

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

# Single optimized query: join pedigree_tree with dogs, filter by year in SQL
cur.execute("""
    SELECT d.dog_id, d.registered_name, d.photo_url, d.sex, d.birthdate,
           d.owner, d.breeder, d.registration_number, d.css_class,
           d.view_count, d.offspring_count, d.posted_date,
           pt.generation, pt.position
    FROM pedigree_tree pt
    JOIN dogs d ON d.dog_id = pt.dog_id
    WHERE pt.ancestor_id = ?
      AND (d.birthdate IS NULL OR d.birthdate = ''
           OR (CAST(SUBSTR(d.birthdate, 1, 4) AS INTEGER) >= ?
               AND CAST(SUBSTR(d.birthdate, 1, 4) AS INTEGER) <= ?))
""", (TARGET_ID, FROM_YEAR, TO_YEAR))

# Build desc_map and dog details in one pass
desc_map = {}
dog_details = {}
for r in cur.fetchall():
    did = r["dog_id"]
    if did not in desc_map:
        desc_map[did] = []
        dog_details[did] = dict(r)
    desc_map[did].append({"gen": r["generation"], "pos": r["position"]})

conn.close()

if not desc_map:
    print(json.dumps({"target": target, "results": [], "total": 0}))
    raise SystemExit(0)

# Calculate scores
scored = []
for did, appearances in desc_map.items():
    d = dog_details[did]
    num_paths = len(appearances)
    min_gen = min(a["gen"] for a in appearances)
    coi = sum(math.pow(0.5, a["gen"] + 1) for a in appearances)
    blood_pct = sum(math.pow(0.5, a["gen"]) * 100 for a in appearances)

    name = (d.get("registered_name") or "").upper()
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
    for a in sorted(appearances, key=lambda x: x["gen"])[:5]:
        g = a["gen"]
        pos = a["pos"]
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

    photo = d.get("photo_url")
    if photo and not photo.startswith("http"):
        photo = "https://www.apbt.online-pedigrees.com/" + photo

    scored.append({
        "id": did,
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
        "lineage_paths": path_desc,
    })

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
