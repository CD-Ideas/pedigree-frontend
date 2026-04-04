export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { unlink } from "fs/promises";

const execFileAsync = promisify(execFile);
const DB = process.env.SQLITE_DB_PATH || "/home/ubuntu/apbt-scraper/apbt_v2.db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { dogName } = await req.json();
    const safeName = dogName.replace(/'/g, "''");
    const script = `
import sqlite3
db = sqlite3.connect("${DB}")
db.execute("UPDATE saved_pedigree_views SET dog_name = '${safeName}' WHERE id = ${id}")
db.commit()
db.close()
print("ok")
`;
    await execFileAsync("python3", ["-c", script], { timeout: 10000 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to rename" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const recordId = parseInt(id, 10);

  if (isNaN(recordId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    // First get the image path so we can delete the file
    const getScript = `
import sqlite3, json

db = sqlite3.connect("${DB}")
db.row_factory = sqlite3.Row
cur = db.cursor()
cur.execute("SELECT image_path FROM saved_pedigree_views WHERE id = ?", (${recordId},))
row = cur.fetchone()
if row:
    print(json.dumps({"image_path": row["image_path"]}))
else:
    print(json.dumps({"image_path": None}))
db.close()
`;

    const { stdout: getOut } = await execFileAsync("python3", ["-c", getScript], { timeout: 15000 });
    const record = JSON.parse(getOut.trim());

    // Delete the file if it exists
    if (record.image_path) {
      try {
        await unlink(`/app/public${record.image_path}`);
      } catch {
        // File may already be deleted, ignore
      }
    }

    // Delete the database record
    const deleteScript = `
import sqlite3

db = sqlite3.connect("${DB}")
cur = db.cursor()
cur.execute("DELETE FROM saved_pedigree_views WHERE id = ?", (${recordId},))
db.commit()
print("ok")
db.close()
`;

    await execFileAsync("python3", ["-c", deleteScript], { timeout: 15000 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Delete pedigree view error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
