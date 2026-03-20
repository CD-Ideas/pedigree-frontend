export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

/**
 * GET /api/dogs/pedigree-tree?sire_id=X&dam_id=X&gens=4
 * Build a pedigree tree from a sire + dam pairing (for Pedigree Lab preview).
 * Returns rows: [{gen, pos, dog_id, name, photo_url, sex}]
 * Gen 1 = sire(pos0) + dam(pos1)
 * Gen 2 = sire's sire(pos0), sire's dam(pos1), dam's sire(pos2), dam's dam(pos3)
 * etc.
 */
export async function GET(req: NextRequest) {
  const sireId = Number(req.nextUrl.searchParams.get("sire_id")) || 0;
  const damId = Number(req.nextUrl.searchParams.get("dam_id")) || 0;
  const gens = Math.min(Number(req.nextUrl.searchParams.get("gens")) || 4, 6);

  if (!sireId && !damId) {
    return NextResponse.json({ rows: [] });
  }

  try {
    const script = `
import sqlite3, json

conn = sqlite3.connect("${DB_PATH}")
conn.row_factory = sqlite3.Row
c = conn.cursor()

def get_dog(did):
    if not did:
        return None
    c.execute("SELECT dog_id, registered_name, photo_url, sex, sire_id, dam_id FROM dogs WHERE dog_id = ?", (did,))
    row = c.fetchone()
    return dict(row) if row else None

rows = []
# Gen 1: sire (pos 0), dam (pos 1)
current_gen = []
sire = get_dog(${sireId}) if ${sireId} else None
dam = get_dog(${damId}) if ${damId} else None

if sire:
    rows.append({"gen": 1, "pos": 0, "dog_id": sire["dog_id"], "name": sire["registered_name"], "photo_url": sire["photo_url"], "sex": sire["sex"]})
    current_gen.append(sire)
else:
    rows.append({"gen": 1, "pos": 0, "dog_id": None, "name": "Unknown", "photo_url": None, "sex": None})
    current_gen.append(None)

if dam:
    rows.append({"gen": 1, "pos": 1, "dog_id": dam["dog_id"], "name": dam["registered_name"], "photo_url": dam["photo_url"], "sex": dam["sex"]})
    current_gen.append(dam)
else:
    rows.append({"gen": 1, "pos": 1, "dog_id": None, "name": "Unknown", "photo_url": None, "sex": None})
    current_gen.append(None)

for g in range(2, ${gens} + 1):
    next_gen = []
    for idx, parent in enumerate(current_gen):
        sire_pos = idx * 2
        dam_pos = idx * 2 + 1
        if parent:
            s = get_dog(parent.get("sire_id"))
            d = get_dog(parent.get("dam_id"))
        else:
            s = None
            d = None
        if s:
            rows.append({"gen": g, "pos": sire_pos, "dog_id": s["dog_id"], "name": s["registered_name"], "photo_url": s["photo_url"], "sex": s["sex"]})
            next_gen.append(s)
        else:
            rows.append({"gen": g, "pos": sire_pos, "dog_id": None, "name": "Unknown", "photo_url": None, "sex": None})
            next_gen.append(None)
        if d:
            rows.append({"gen": g, "pos": dam_pos, "dog_id": d["dog_id"], "name": d["registered_name"], "photo_url": d["photo_url"], "sex": d["sex"]})
            next_gen.append(d)
        else:
            rows.append({"gen": g, "pos": dam_pos, "dog_id": None, "name": "Unknown", "photo_url": None, "sex": None})
            next_gen.append(None)
    current_gen = next_gen

conn.close()
print(json.dumps(rows))
`;
    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 15000 });
    const rows = JSON.parse(stdout || "[]");
    return NextResponse.json({ rows });
  } catch (_e) {
    return NextResponse.json({ rows: [] });
  }
}
