export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB = process.env.SQLITE_DB_PATH || "/home/ubuntu/apbt-scraper/apbt_v2.db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userIdStr = url.searchParams.get("userId");
  const userId = userIdStr ? parseInt(userIdStr, 10) : null;

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const script = `
import sqlite3, json

db = sqlite3.connect("${DB}")
db.row_factory = sqlite3.Row
cur = db.cursor()
cur.execute("""
    SELECT id, dog_name, generation, image_path, created_at
    FROM saved_pedigree_views
    WHERE user_id = ?
    ORDER BY created_at DESC
""", (${userId},))
rows = [dict(r) for r in cur.fetchall()]
print(json.dumps(rows))
db.close()
`;

    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 15000 });
    const views = JSON.parse(stdout.trim());
    return NextResponse.json({ views });
  } catch (err: unknown) {
    console.error("List pedigree views error:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
