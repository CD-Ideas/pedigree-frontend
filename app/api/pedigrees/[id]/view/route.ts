import { NextRequest, NextResponse } from "next/server";
import { promisify } from "util";
import { execFile } from "child_process";

const execFileAsync = promisify(execFile);
const DB = process.env.SQLITE_DB_PATH || "/home/ubuntu/apbt-scraper/apbt_v2.db";

export async function POST(
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
cur = db.cursor()
cur.execute("UPDATE published_pedigrees SET view_count = view_count + 1 WHERE id = ?", (${pedId},))
db.commit()
cur.execute("SELECT view_count FROM published_pedigrees WHERE id = ?", (${pedId},))
row = cur.fetchone()
print(json.dumps({"views": row[0] if row else 0}))
db.close()
`;

    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 15000 });
    const data = JSON.parse(stdout.trim());

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("View count error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
