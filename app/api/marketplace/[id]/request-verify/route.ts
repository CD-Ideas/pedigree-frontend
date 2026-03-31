export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = process.env.SQLITE_DB_PATH || "/home/ubuntu/apbt-scraper/apbt_v2.db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const adId = parseInt(id);
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { stdout } = await execFileAsync("python3", ["-c", `
import sqlite3, json
from datetime import datetime

conn = sqlite3.connect("${DB_PATH}")
c = conn.cursor()

# Check ad belongs to user
c.execute("SELECT user_id, is_verified, verification_requested FROM marketplace_ads WHERE id = ?", (${adId},))
row = c.fetchone()

if not row:
    print(json.dumps({"error": "Ad not found"}))
    conn.close()
    raise SystemExit(0)

if row[0] != ${parseInt(String(userId))}:
    print(json.dumps({"error": "Not your ad"}))
    conn.close()
    raise SystemExit(0)

if row[1] == 1:
    print(json.dumps({"error": "Already verified"}))
    conn.close()
    raise SystemExit(0)

if row[2] == 1:
    print(json.dumps({"error": "Verification already requested"}))
    conn.close()
    raise SystemExit(0)

c.execute("UPDATE marketplace_ads SET verification_requested = 1, verification_requested_at = ? WHERE id = ?",
    (datetime.utcnow().isoformat(), ${adId}))
conn.commit()
print(json.dumps({"success": True}))
conn.close()
`], { timeout: 10000 });

    const data = JSON.parse(stdout);
    if (data.error) {
      return NextResponse.json(data, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Request verify error:", err);
    return NextResponse.json({ error: "Failed to request verification" }, { status: 500 });
  }
}
