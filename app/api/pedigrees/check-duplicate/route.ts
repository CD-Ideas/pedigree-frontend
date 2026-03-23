export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

export async function GET(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get("name") || "";
    const excludeId = req.nextUrl.searchParams.get("excludeId") || "0";

    if (!name.trim()) {
      return NextResponse.json({ exists: false });
    }

    const safeExcludeId = parseInt(excludeId, 10) || 0;

    const script = `
import sqlite3, json, sys
name = sys.argv[1]
exclude_id = int(sys.argv[2])
conn = sqlite3.connect("${DB_PATH}")
if exclude_id > 0:
    row = conn.execute("SELECT COUNT(*) FROM published_pedigrees WHERE LOWER(name) = LOWER(?) AND id != ?", (name, exclude_id)).fetchone()
else:
    row = conn.execute("SELECT COUNT(*) FROM published_pedigrees WHERE LOWER(name) = LOWER(?)", (name,)).fetchone()
conn.close()
print(json.dumps({"exists": row[0] > 0}))
`;

    const { stdout } = await execFileAsync("python3", ["-c", script, name.trim(), String(safeExcludeId)], { timeout: 10000 });
    const data = JSON.parse(stdout.trim());
    return NextResponse.json(data);
  } catch (_e) {
    return NextResponse.json({ exists: false });
  }
}
