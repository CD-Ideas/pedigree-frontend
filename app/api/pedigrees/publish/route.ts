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

    // Auth: get user_id from token
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "") || "";
    let userId: number | null = null;

    if (token) {
      const tokenB64 = Buffer.from(token).toString("base64");
      const authScript = `
import sqlite3, json, base64

token = base64.b64decode("${tokenB64}").decode("utf-8")
conn = sqlite3.connect("${DB}")
c = conn.cursor()
c.execute("SELECT id FROM users WHERE id = (SELECT user_id FROM user_sessions WHERE token = ?)", (token,))
row = c.fetchone()
conn.close()
if row:
    print(json.dumps({"user_id": row[0]}))
else:
    print(json.dumps({"user_id": None}))
`;
      try {
        const { stdout: authOut } = await execFileAsync("python3", ["-c", authScript], { timeout: 5000 });
        const authData = JSON.parse(authOut.trim());
        userId = authData.user_id;
      } catch (_e) {
        // Token lookup failed, try simpler approach - get user_id from formData
      }
    }

    // Fallback: get user_id from form data (sent by client from localStorage)
    if (!userId) {
      const userIdStr = formData.get("userId") as string;
      if (userIdStr) userId = parseInt(userIdStr, 10) || null;
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
    const scrapedMatchId = parseInt((formData.get("scrapedMatchId") as string) || "0", 10) || null;
    const duplicateStatus = scrapedMatchId ? "linked" : "none";

    // Handle photo upload
    let photoPath = "";
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

      photoPath = `/uploads/${filename}`;
    }

    const userIdSql = userId ? `${userId}` : "None";

    const script = `
import sqlite3, json, sys

db = sqlite3.connect("${DB}")
cur = db.cursor()
cur.execute("""
  INSERT INTO published_pedigrees
    (name, prefix, suffix_wins, suffix_losses, suffix_draws, suffix_honors,
     dob, sex, color, continent, country, breeder, owner, conditioned_weight,
     pedigree_notes, journal_json, slots_json, tree_json, photo_path, user_id, show_in_title_feed, scraped_match_id, duplicate_status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", (
  ${JSON.stringify(name)}, ${JSON.stringify(prefix)},
  ${JSON.stringify(suffixWins)}, ${JSON.stringify(suffixLosses)},
  ${JSON.stringify(suffixDraws)}, ${JSON.stringify(suffixHonors)},
  ${JSON.stringify(dob)}, ${JSON.stringify(sex)}, ${JSON.stringify(color)},
  ${JSON.stringify(continent)}, ${JSON.stringify(country)},
  ${JSON.stringify(breeder)}, ${JSON.stringify(owner)},
  ${JSON.stringify(conditionedWeight)}, ${JSON.stringify(pedigreeNotes)},
  ${JSON.stringify(journalJson)}, ${JSON.stringify(slotsJson)},
  ${JSON.stringify(treeJson)}, ${JSON.stringify(photoPath)},
  ${userIdSql}, ${showInTitleFeed}, ${scrapedMatchId || "None"}, ${JSON.stringify(duplicateStatus)}
))
db.commit()
print(json.dumps({"id": cur.lastrowid}))
db.close()
`;

    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 15000 });
    const result = JSON.parse(stdout.trim());
    const ppId = result.id;

    // Also insert into main dogs table so it appears in search/browse
    const dogId = 10000000 + ppId;
    const dogScript = `
import sqlite3, json, sys
db = sqlite3.connect("${DB}")
cur = db.cursor()
# Build full display name with prefix + suffix
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
cur.execute("""
  INSERT OR REPLACE INTO dogs (dog_id, registered_name, sex, color, breeder, owner, birthdate,
    conditioned_weight, description, sire_id, dam_id, posted_date, modified_date, view_count, source)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 0, 'user')
""", (
  ${dogId}, full_name, ${JSON.stringify(sex)}, ${JSON.stringify(color)},
  ${JSON.stringify(breeder)}, ${JSON.stringify(owner)}, ${JSON.stringify(dob)},
  ${JSON.stringify(conditionedWeight)}, ${JSON.stringify(pedigreeNotes)},
  sire_id_val, dam_id_val
))
db.commit()
print(json.dumps({"dog_id": ${dogId}}))
db.close()
`;
    try {
      await execFileAsync("python3", ["-c", dogScript], { timeout: 15000 });
    } catch (e) {
      console.error("Failed to insert into dogs table:", e);
    }

    // Populate pedigree_tree for this published pedigree (enables Spotlight & Bloodline Calculator)
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

# Delete existing entries
cur.execute("DELETE FROM pedigree_tree WHERE dog_id = ?", (DOG_ID,))

# BFS to build tree
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
        # Check existing pedigree_tree for this ancestor
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
      console.error("Failed to populate pedigree_tree:", e);
    }

    // Create title alert notifications for all users (except creator) if show_in_title_feed is ON
    if (showInTitleFeed === 1 && userId) {
      // Build display name
      let displayName = name;
      if (prefix && prefix !== "NONE" && prefix.trim()) displayName = prefix.trim() + " " + displayName;
      const suffixParts: string[] = [];
      if (suffixWins && suffixWins !== "0" && suffixWins.trim()) suffixParts.push(suffixWins.trim());
      if (suffixLosses && suffixLosses !== "0" && suffixLosses.trim()) suffixParts.push(suffixLosses.trim());
      if (suffixDraws && suffixDraws !== "0" && suffixDraws.trim()) suffixParts.push(suffixDraws.trim());
      if (suffixHonors && suffixHonors !== "0" && suffixHonors.trim()) suffixParts.push(suffixHonors.trim());
      if (suffixParts.length > 0) displayName += " " + suffixParts.join(" ");

      const notifScript = `
import sqlite3
conn = sqlite3.connect("${DB}")
cur = conn.cursor()
cur.execute("SELECT id FROM users WHERE id != ?", (${userId},))
users = [r[0] for r in cur.fetchall()]
title = ${JSON.stringify(`New title: ${displayName}`)}
body = ${JSON.stringify(`A new titled pedigree was just published.`)}
link = "/dashboard/new-title-alerts"
for uid in users:
    cur.execute("INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, 'title', ?, ?, ?)", (uid, title, body, link))
conn.commit()
conn.close()
`;
      try {
        await execFileAsync("python3", ["-c", notifScript], { timeout: 10000 });
      } catch (e) {
        console.error("Failed to create title notifications:", e);
      }
    }

    return NextResponse.json({ success: true, id: ppId, dogId: dogId });
  } catch (err: unknown) {
    console.error("Publish error:", err);
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
  }
}
