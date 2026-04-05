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
print(json.dumps({"success": True, "id": ${pedId}}))
db.close()
`;

    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 15000 });
    const result = JSON.parse(stdout.trim());

    if (result.error) {
      return NextResponse.json(result, { status: 403 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Update pedigree error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
