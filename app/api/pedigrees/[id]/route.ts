import { NextRequest, NextResponse } from "next/server";
import { promisify } from "util";
import { execFile } from "child_process";

const execFileAsync = promisify(execFile);
const DB = "/home/ubuntu/apbt-scraper/apbt_v2.db";

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
