import { NextRequest, NextResponse } from "next/server";
import { promisify } from "util";
import { execFile } from "child_process";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const execFileAsync = promisify(execFile);
const DB = process.env.SQLITE_DB_PATH || "/home/ubuntu/apbt-scraper/apbt_v2.db";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const pedId = parseInt(formData.get("id") as string, 10);
    const userId = parseInt(formData.get("userId") as string, 10);

    if (!pedId || !userId) {
      return NextResponse.json({ error: "id and userId required" }, { status: 400 });
    }

    const name = ((formData.get("name") as string) || "").toUpperCase();
    const prefix = ((formData.get("prefix") as string) || "").toUpperCase();
    const suffixWins = ((formData.get("suffixWins") as string) || "").toUpperCase();
    const suffixLosses = ((formData.get("suffixLosses") as string) || "").toUpperCase();
    const suffixDraws = ((formData.get("suffixDraws") as string) || "").toUpperCase();
    const suffixHonors = ((formData.get("suffixHonors") as string) || "").toUpperCase();
    const dob = (formData.get("dob") as string) || "";
    const sex = ((formData.get("sex") as string) || "Male").toUpperCase();
    const color = ((formData.get("color") as string) || "").toUpperCase();
    const continent = ((formData.get("continent") as string) || "").toUpperCase();
    const country = ((formData.get("country") as string) || "").toUpperCase();
    const breeder = ((formData.get("breeder") as string) || "").toUpperCase();
    const owner = ((formData.get("owner") as string) || "").toUpperCase();
    const conditionedWeight = (formData.get("conditionedWeight") as string) || "";
    const pedigreeNotes = (formData.get("pedigreeNotes") as string) || "";
    const journalJson = (formData.get("journalJson") as string) || "{}";
    const slotsJson = (formData.get("slotsJson") as string) || "{}";
    const treeJson = (formData.get("treeJson") as string) || "[]";
    const showInTitleFeed = (formData.get("showInTitleFeed") as string) === "1" ? 1 : 0;

    // Handle photo upload
    let photoClause = "";
    const photoFile = formData.get("photo") as File | null;
    if (photoFile && photoFile.size > 0) {
      const bytes = await photoFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = photoFile.name.split(".").pop() || "jpg";
      const filename = `ped_${Date.now()}.${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), buffer);

      // Auto-rotate based on EXIF
      if (/\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) {
        try {
          await execFileAsync("python3", ["-c", `
from PIL import Image, ImageOps
import sys
img = Image.open(sys.argv[1])
img = ImageOps.exif_transpose(img)
img.save(sys.argv[1])
`, path.join(uploadDir, filename)], { timeout: 10000 });
        } catch (_e) {}
      }

      photoClause = `, photo_path = '/uploads/${filename}'`;
    }

    const script = `
import sqlite3, json

db = sqlite3.connect("${DB}")
cur = db.cursor()

# Verify ownership
cur.execute("SELECT user_id FROM published_pedigrees WHERE id = ?", (${pedId},))
row = cur.fetchone()
if not row or row[0] != ${userId}:
    print(json.dumps({"error": "Unauthorized"}))
    db.close()
    exit()

cur.execute("""
  UPDATE published_pedigrees SET
    name = ?, prefix = ?, suffix_wins = ?, suffix_losses = ?, suffix_draws = ?, suffix_honors = ?,
    dob = ?, sex = ?, color = ?, continent = ?, country = ?, breeder = ?, owner = ?,
    conditioned_weight = ?, pedigree_notes = ?, journal_json = ?, slots_json = ?, tree_json = ?,
    show_in_title_feed = ?, last_modified = datetime('now')${photoClause}
  WHERE id = ? AND user_id = ?
""", (
  ${JSON.stringify(name)}, ${JSON.stringify(prefix)},
  ${JSON.stringify(suffixWins)}, ${JSON.stringify(suffixLosses)},
  ${JSON.stringify(suffixDraws)}, ${JSON.stringify(suffixHonors)},
  ${JSON.stringify(dob)}, ${JSON.stringify(sex)}, ${JSON.stringify(color)},
  ${JSON.stringify(continent)}, ${JSON.stringify(country)},
  ${JSON.stringify(breeder)}, ${JSON.stringify(owner)},
  ${JSON.stringify(conditionedWeight)}, ${JSON.stringify(pedigreeNotes)},
  ${JSON.stringify(journalJson)}, ${JSON.stringify(slotsJson)},
  ${JSON.stringify(treeJson)},
  ${showInTitleFeed},
  ${pedId}, ${userId}
))
db.commit()
if ${showInTitleFeed} == 1:
    cur.execute("DELETE FROM title_alert_reads WHERE alert_id = ?", (${pedId},))
    db.commit()
# Also update the dogs table entry with full display name
full_name = ${JSON.stringify(name)}
prefix_val = ${JSON.stringify(prefix)}
if prefix_val and prefix_val != "NONE" and prefix_val.strip():
    full_name = prefix_val.strip() + " " + full_name
parts = []
sw = ${JSON.stringify(suffixWins)}
sl = ${JSON.stringify(suffixLosses)}
sd = ${JSON.stringify(suffixDraws)}
sh = ${JSON.stringify(suffixHonors)}
if sw and sw != "0" and sw.strip(): parts.append(sw.strip())
if sl and sl != "0" and sl.strip(): parts.append(sl.strip())
if sd and sd != "0" and sd.strip(): parts.append(sd.strip())
if sh and sh != "0" and sh.strip(): parts.append(sh.strip())
if parts:
    full_name += " " + " ".join(parts)
# Parse sire_id and dam_id from slots
sire_id_val = None
dam_id_val = None
try:
    slots_data = json.loads(${JSON.stringify(slotsJson)})
    if isinstance(slots_data.get("sire"), dict) and slots_data["sire"].get("dog_id"):
        sire_id_val = slots_data["sire"]["dog_id"]
    if isinstance(slots_data.get("dam"), dict) and slots_data["dam"].get("dog_id"):
        dam_id_val = slots_data["dam"]["dog_id"]
except:
    pass
cur.execute("UPDATE dogs SET registered_name = ?, sex = ?, color = ?, breeder = ?, owner = ?, birthdate = ?, conditioned_weight = ?, description = ?, sire_id = ?, dam_id = ?, modified_date = datetime('now') WHERE dog_id = ?", (full_name, ${JSON.stringify(sex)}, ${JSON.stringify(color)}, ${JSON.stringify(breeder)}, ${JSON.stringify(owner)}, ${JSON.stringify(dob)}, ${JSON.stringify(conditionedWeight)}, ${JSON.stringify(pedigreeNotes)}, sire_id_val, dam_id_val, 10000000 + ${pedId}))
db.commit()
print(json.dumps({"success": True, "id": ${pedId}}))
db.close()
`;

    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 15000 });
    const result = JSON.parse(stdout.trim());

    if (result.error) {
      return NextResponse.json(result, { status: 403 });
    }

    // Rebuild pedigree_tree for this published pedigree (enables Spotlight & Bloodline Calculator)
    const dogId = 10000000 + pedId;
    const treeScript = `
import sqlite3, json

DB = "${DB}"
DOG_ID = ${dogId}
MAX_GEN = 6

conn = sqlite3.connect(DB)
cur = conn.cursor()

def get_position(gen, index):
    if gen == 1:
        return "G1_sire_0" if index == 0 else "G1_dam_1"
    side = "S" if index % 2 == 0 else "D"
    return f"G{gen}_{side}_{index}"

cur.execute("DELETE FROM pedigree_tree WHERE dog_id = ?", (DOG_ID,))

queue = []
cur.execute("SELECT sire_id, dam_id FROM dogs WHERE dog_id = ?", (DOG_ID,))
row = cur.fetchone()
if row:
    sire_id, dam_id = row
    if sire_id: queue.append((int(sire_id), 1, 0))
    if dam_id: queue.append((int(dam_id), 1, 1))

inserted = 0
while queue:
    ancestor_id, gen, idx = queue.pop(0)
    cur.execute("SELECT registered_name, css_class FROM dogs WHERE dog_id = ?", (ancestor_id,))
    arow = cur.fetchone()
    if not arow:
        continue
    name, css_class = arow
    position = get_position(gen, idx)
    try:
        cur.execute("INSERT OR REPLACE INTO pedigree_tree (dog_id, ancestor_id, ancestor_name, position, generation, css_class) VALUES (?,?,?,?,?,?)",
                    (DOG_ID, ancestor_id, name, position, gen, css_class))
        inserted += 1
    except:
        pass

    if gen < MAX_GEN:
        cur.execute("SELECT ancestor_id, ancestor_name, position, generation, css_class FROM pedigree_tree WHERE dog_id = ?", (ancestor_id,))
        subtree = cur.fetchall()
        if subtree:
            for sub_anc_id, sub_name, sub_pos, sub_gen, sub_css in subtree:
                new_gen = gen + sub_gen
                if new_gen > MAX_GEN:
                    continue
                sub_idx = int(sub_pos.split("_")[-1])
                new_idx = (2 ** sub_gen) * idx + sub_idx
                new_pos = get_position(new_gen, new_idx)
                try:
                    cur.execute("INSERT OR REPLACE INTO pedigree_tree (dog_id, ancestor_id, ancestor_name, position, generation, css_class) VALUES (?,?,?,?,?,?)",
                                (DOG_ID, sub_anc_id, sub_name, new_pos, new_gen, sub_css))
                    inserted += 1
                except:
                    pass
        else:
            cur.execute("SELECT sire_id, dam_id FROM dogs WHERE dog_id = ?", (ancestor_id,))
            prow = cur.fetchone()
            if prow:
                s, d = prow
                if s: queue.append((int(s), gen + 1, 2 * idx))
                if d: queue.append((int(d), gen + 1, 2 * idx + 1))

conn.commit()
conn.close()
print(json.dumps({"inserted": inserted}))
`;
    try {
      await execFileAsync("python3", ["-c", treeScript], { timeout: 30000 });
    } catch (e) {
      console.error("Failed to rebuild pedigree_tree:", e);
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Update pedigree error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
