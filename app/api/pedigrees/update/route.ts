import { NextRequest, NextResponse } from "next/server";
import { promisify } from "util";
import { execFile } from "child_process";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const execFileAsync = promisify(execFile);
const DB = "/home/ubuntu/apbt-scraper/apbt_v2.db";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const pedId = parseInt(formData.get("id") as string, 10);
    const userId = parseInt(formData.get("userId") as string, 10);

    if (!pedId || !userId) {
      return NextResponse.json({ error: "id and userId required" }, { status: 400 });
    }

    const name = (formData.get("name") as string) || "";
    const prefix = (formData.get("prefix") as string) || "";
    const suffixWins = (formData.get("suffixWins") as string) || "";
    const suffixLosses = (formData.get("suffixLosses") as string) || "";
    const suffixDraws = (formData.get("suffixDraws") as string) || "";
    const suffixHonors = (formData.get("suffixHonors") as string) || "";
    const dob = (formData.get("dob") as string) || "";
    const sex = (formData.get("sex") as string) || "Male";
    const color = (formData.get("color") as string) || "";
    const continent = (formData.get("continent") as string) || "";
    const country = (formData.get("country") as string) || "";
    const breeder = (formData.get("breeder") as string) || "";
    const owner = (formData.get("owner") as string) || "";
    const conditionedWeight = (formData.get("conditionedWeight") as string) || "";
    const pedigreeNotes = (formData.get("pedigreeNotes") as string) || "";
    const journalJson = (formData.get("journalJson") as string) || "{}";
    const slotsJson = (formData.get("slotsJson") as string) || "{}";
    const treeJson = (formData.get("treeJson") as string) || "[]";

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
    last_modified = datetime('now')${photoClause}
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
  ${pedId}, ${userId}
))
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
