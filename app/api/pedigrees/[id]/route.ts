import { NextRequest, NextResponse } from "next/server";
import { promisify } from "util";
import { execFile } from "child_process";

const execFileAsync = promisify(execFile);
const DB = process.env.SQLITE_DB_PATH || "/home/ubuntu/apbt-scraper/apbt_v2.db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pedId = parseInt(id, 10);
  if (isNaN(pedId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const script = `
import sqlite3, json

db = sqlite3.connect("${DB}")
db.row_factory = sqlite3.Row
cur = db.cursor()
cur.execute("""
    SELECT p.*, u.username as creator_username
    FROM published_pedigrees p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
""", (${pedId},))
row = cur.fetchone()
if not row:
    print(json.dumps(None))
else:
    d = dict(row)
    print(json.dumps(d))
db.close()
`;

    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 15000 });
    const data = JSON.parse(stdout.trim());

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("Fetch pedigree error:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pedId = parseInt(id, 10);
  if (isNaN(pedId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const { searchParams } = req.nextUrl;
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const script = `
import sqlite3, json

db = sqlite3.connect("${DB}")
db.row_factory = sqlite3.Row
cur = db.cursor()
cur.execute("SELECT user_id FROM published_pedigrees WHERE id = ?", (${pedId},))
row = cur.fetchone()
if not row:
    print(json.dumps({"error": "not_found"}))
    db.close()
    raise SystemExit(0)
if row["user_id"] != ${parseInt(String(userId))}:
    print(json.dumps({"error": "forbidden"}))
    db.close()
    raise SystemExit(0)
cur.execute("DELETE FROM published_pedigrees WHERE id = ?", (${pedId},))
cur.execute("DELETE FROM dogs WHERE dog_id = ?", (10000000 + ${pedId},))
try:
    cur.execute("DELETE FROM dogs_fts WHERE rowid = ?", (10000000 + ${pedId},))
except:
    pass
db.commit()
print(json.dumps({"success": True}))
db.close()
`;

    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 15000 });
    const data = JSON.parse(stdout.trim());

    if (data.error === "not_found") {
      return NextResponse.json({ error: "Pedigree not found" }, { status: 404 });
    }
    if (data.error === "forbidden") {
      return NextResponse.json({ error: "You can only delete your own pedigrees" }, { status: 403 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("Delete pedigree error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
