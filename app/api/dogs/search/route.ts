export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

async function queryDb(script: string): Promise<unknown> {
  const { stdout } = await execFileAsync("python3", ["-c", script], {
    timeout: 10000,
  });
  return JSON.parse(stdout);
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 10, 20);

  if (q.length < 2) {
    return NextResponse.json({ dogs: [] });
  }

  const safeQ = q.replace(/'/g, "''").replace(/\\/g, "");

  try {
    const dogs = await queryDb(`
import sqlite3, json
conn = sqlite3.connect("${DB_PATH}")
conn.row_factory = sqlite3.Row
c = conn.cursor()
c.execute("SELECT dog_id, registered_name, photo_url FROM dogs WHERE registered_name LIKE ? ORDER BY view_count DESC LIMIT ?", ('%${safeQ}%', ${limit}))
rows = [dict(r) for r in c.fetchall()]
conn.close()
print(json.dumps(rows))
`);
    return NextResponse.json({ dogs });
  } catch {
    return NextResponse.json({ dogs: [] });
  }
}
