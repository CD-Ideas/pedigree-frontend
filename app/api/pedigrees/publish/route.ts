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
     pedigree_notes, journal_json, slots_json, tree_json, photo_path, user_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  ${userIdSql}
))
db.commit()
print(json.dumps({"id": cur.lastrowid}))
db.close()
`;

    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 15000 });
    const result = JSON.parse(stdout.trim());

    return NextResponse.json({ success: true, id: result.id });
  } catch (err: unknown) {
    console.error("Publish error:", err);
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
  }
}
