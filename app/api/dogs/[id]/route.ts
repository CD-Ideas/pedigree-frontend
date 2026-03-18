export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

async function queryDb(script: string): Promise<any> {
  const { stdout } = await execFileAsync("python3", ["-c", script], {
    timeout: 60000,
  });
  return JSON.parse(stdout);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dogId = parseInt(id, 10);
    if (isNaN(dogId)) {
      return NextResponse.json({ error: "Invalid dog ID" }, { status: 400 });
    }

    const maxGen = Math.min(parseInt(req.nextUrl.searchParams.get("gen") || "5", 10), 16);

    const data = await queryDb(`
import sqlite3, json

dog_id = ${dogId}
max_gen = ${maxGen}

conn = sqlite3.connect("${DB_PATH}", timeout=5)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

cur.execute("SELECT * FROM dogs WHERE dog_id = ?", (dog_id,))
row = cur.fetchone()
if not row:
    print(json.dumps({"error": "not_found"}))
    conn.close()
    raise SystemExit(0)

dog = dict(row)

# Sire object
sire = None
if dog.get("sire_id"):
    cur.execute("SELECT dog_id, registered_name, sex, photo_url FROM dogs WHERE dog_id = ?", (dog["sire_id"],))
    sr = cur.fetchone()
    if sr:
        sire = {"id": sr["dog_id"], "name": sr["registered_name"], "sex": sr["sex"], "photo_url": sr["photo_url"]}

# Dam object
dam = None
if dog.get("dam_id"):
    cur.execute("SELECT dog_id, registered_name, sex, photo_url FROM dogs WHERE dog_id = ?", (dog["dam_id"],))
    dr = cur.fetchone()
    if dr:
        dam = {"id": dr["dog_id"], "name": dr["registered_name"], "sex": dr["sex"], "photo_url": dr["photo_url"]}

# Pedigree tree (up to gen 4 from DB) — join dogs to get photo_url
cur.execute("""
  SELECT pt.dog_id, pt.ancestor_id, pt.ancestor_name, pt.position, pt.generation, pt.css_class,
         d.photo_url as ancestor_photo
  FROM pedigree_tree pt
  LEFT JOIN dogs d ON d.dog_id = pt.ancestor_id
  WHERE pt.dog_id = ? ORDER BY pt.generation, pt.position
""", (dog_id,))
pedigree = [dict(r) for r in cur.fetchall()]

# Sort pedigree by numeric suffix in position (fixes display order)
import re as _re
def _pos_sort_key(p):
    m = _re.search(r'(\d+)$', p.get('position', '0'))
    return (p.get('generation', 0), int(m.group(1)) if m else 0)
pedigree.sort(key=_pos_sort_key)

# Build deeper generations dynamically (gen 5 through max_gen)
max_db_gen = max((p["generation"] for p in pedigree), default=0)
for gen in range(max_db_gen + 1, max_gen + 1):
    prev_gen = [p for p in pedigree if p["generation"] == gen - 1]
    for pg in prev_gen:
        aid = pg.get("ancestor_id")
        if not aid:
            continue
        cur.execute("SELECT dog_id, registered_name, sex, sire_id, dam_id, css_class, photo_url FROM dogs WHERE dog_id = ?", (aid,))
        arow = cur.fetchone()
        if not arow:
            continue
        pos = pg.get("position", "")
        if arow["sire_id"]:
            cur.execute("SELECT dog_id, registered_name, css_class, photo_url FROM dogs WHERE dog_id = ?", (arow["sire_id"],))
            sr = cur.fetchone()
            if sr:
                pedigree.append({"dog_id": dog_id, "ancestor_id": sr["dog_id"], "ancestor_name": sr["registered_name"], "position": pos + "_S", "generation": gen, "css_class": sr["css_class"] or "male", "ancestor_photo": sr["photo_url"]})
            else:
                pedigree.append({"dog_id": dog_id, "ancestor_id": None, "ancestor_name": "Unknown", "position": pos + "_S", "generation": gen, "css_class": "male", "ancestor_photo": None})
        else:
            pedigree.append({"dog_id": dog_id, "ancestor_id": None, "ancestor_name": "Unknown", "position": pos + "_S", "generation": gen, "css_class": "male", "ancestor_photo": None})
        if arow["dam_id"]:
            cur.execute("SELECT dog_id, registered_name, css_class, photo_url FROM dogs WHERE dog_id = ?", (arow["dam_id"],))
            dr = cur.fetchone()
            if dr:
                pedigree.append({"dog_id": dog_id, "ancestor_id": dr["dog_id"], "ancestor_name": dr["registered_name"], "position": pos + "_D", "generation": gen, "css_class": dr["css_class"] or "female", "ancestor_photo": dr["photo_url"]})
            else:
                pedigree.append({"dog_id": dog_id, "ancestor_id": None, "ancestor_name": "Unknown", "position": pos + "_D", "generation": gen, "css_class": "female", "ancestor_photo": None})
        else:
            pedigree.append({"dog_id": dog_id, "ancestor_id": None, "ancestor_name": "Unknown", "position": pos + "_D", "generation": gen, "css_class": "female", "ancestor_photo": None})

# Re-sort pedigree after dynamic gen additions
pedigree.sort(key=_pos_sort_key)

# Offspring (join dogs table for photo_url)
cur.execute("""
  SELECT o.offspring_id, o.offspring_name, o.sire_id, o.sire_name, o.dam_id, o.dam_name,
         d.photo_url
  FROM offspring o
  LEFT JOIN dogs d ON d.dog_id = o.offspring_id
  WHERE o.parent_id = ?
""", (dog_id,))
offspring_list = [dict(r) for r in cur.fetchall()]

# Siblings
cur.execute("""
  SELECT sibling_id, sibling_name, relation, sire_id, dam_id
  FROM siblings WHERE dog_id = ?
""", (dog_id,))
all_siblings = [dict(r) for r in cur.fetchall()]
import re
for s in all_siblings:
    s["sibling_name"] = re.sub(r'\\s+', ' ', s["sibling_name"]).strip()

full = [s for s in all_siblings if s["relation"] == "full"]
half_sire = [s for s in all_siblings if s["relation"] == "half_sire"]
half_dam = [s for s in all_siblings if s["relation"] == "half_dam"]

# Genetic contributions
cur.execute("""
  SELECT ancestor_id, ancestor_name, percentage
  FROM genetic_contributions WHERE dog_id = ?
  ORDER BY percentage DESC
""", (dog_id,))
genetics = [dict(r) for r in cur.fetchall()]

conn.close()

result = {
    "id": dog["dog_id"],
    "registered_name": dog["registered_name"],
    "registration_number": dog["registration_number"],
    "call_name": dog["call_name"],
    "sex": dog["sex"],
    "color": dog["color"],
    "chain_weight": dog["chain_weight"],
    "conditioned_weight": dog["conditioned_weight"],
    "birthdate": dog["birthdate"],
    "death_date": dog["death_date"],
    "breeder": dog["breeder"],
    "owner": dog["owner"],
    "description": dog["description"],
    "photo_url": dog["photo_url"],
    "css_class": dog["css_class"],
    "posted_date": dog["posted_date"],
    "modified_date": dog["modified_date"],
    "view_count": dog["view_count"],
    "sire_id": dog["sire_id"],
    "dam_id": dog["dam_id"],
    "offspring_count": dog["offspring_count"],
    "full_siblings_count": dog["full_siblings_count"],
    "half_siblings_sire_count": dog["half_siblings_sire_count"],
    "half_siblings_dam_count": dog["half_siblings_dam_count"],
    "scraped_at": dog["scraped_at"],
    "reg_number": f"APBT-{dog['dog_id']}",
    "sire": sire,
    "dam": dam,
    "pedigree": pedigree,
    "offspring": offspring_list,
    "siblings": {
        "full": full,
        "halfSire": half_sire,
        "halfDam": half_dam
    },
    "genetic_contributions": genetics
}

print(json.dumps(result, default=str))
`);

    if (data.error === "not_found") {
      return NextResponse.json({ error: "Dog not found" }, { status: 404 });
    }

    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Dog detail route error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dog details", detail: error.message },
      { status: 500 }
    );
  }
}
