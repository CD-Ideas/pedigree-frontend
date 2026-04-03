export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir } from "fs/promises";

const execFileAsync = promisify(execFile);
const DB = process.env.SQLITE_DB_PATH || "/home/ubuntu/apbt-scraper/apbt_v2.db";
const UPLOAD_DIR = "/app/public/uploads/pedigree-views";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, dogName, generation, image } = body;

    if (!userId || !dogName || !generation || !image) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Extract base64 data (remove data:image/png;base64, prefix)
    const base64Data = image.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const timestamp = Date.now();
    const filename = `${userId}_${timestamp}.png`;
    const filePath = `${UPLOAD_DIR}/${filename}`;
    const imagePath = `/uploads/pedigree-views/${filename}`;

    // Write image file
    await writeFile(filePath, buffer);

    // Insert record into database
    const safeDogName = dogName.replace(/'/g, "''");
    const script = `
import sqlite3, json

db = sqlite3.connect("${DB}")
cur = db.cursor()
cur.execute("""
    INSERT INTO saved_pedigree_views (user_id, dog_name, generation, image_path)
    VALUES (?, ?, ?, ?)
""", (${userId}, '${safeDogName}', ${generation}, '${imagePath}'))
db.commit()
row_id = cur.lastrowid
print(json.dumps({"id": row_id}))
db.close()
`;

    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 15000 });
    const result = JSON.parse(stdout.trim());

    return NextResponse.json({ success: true, id: result.id });
  } catch (err: unknown) {
    console.error("Save pedigree view error:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
