export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 10, 20);

  if (q.length < 2) {
    return NextResponse.json({ dogs: [] });
  }

  // Pass the search term as a base64-encoded argument to avoid quote issues
  const searchB64 = Buffer.from(q).toString("base64");

  try {
    const script = `
import sqlite3, json, base64
search = base64.b64decode("${searchB64}").decode("utf-8")
conn = sqlite3.connect("${DB_PATH}")
conn.row_factory = sqlite3.Row
c = conn.cursor()
c.execute("SELECT dog_id, registered_name, photo_url FROM dogs WHERE registered_name LIKE ? ORDER BY view_count DESC LIMIT ?", ('%' + search + '%', ${limit}))
rows = [dict(r) for r in c.fetchall()]
conn.close()
print(json.dumps(rows))
`;
    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 10000 });
    const dogs = JSON.parse(stdout || "[]");
    return NextResponse.json({ dogs });
  } catch {
    return NextResponse.json({ dogs: [] });
  }
}
