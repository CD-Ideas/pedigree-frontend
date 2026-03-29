export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

// GET /api/messages/reactions?messageIds=1,2,3
export async function GET(req: NextRequest) {
  try {
    const ids = req.nextUrl.searchParams.get("messageIds") || "";
    if (!ids) return NextResponse.json({ reactions: {} });

    const idList = ids.split(",").map(Number).filter(n => !isNaN(n));
    if (idList.length === 0) return NextResponse.json({ reactions: {} });

    const script = `
import sqlite3, json, sys
ids = [${idList.join(",")}]
conn = sqlite3.connect("${DB_PATH}")
conn.row_factory = sqlite3.Row
placeholders = ",".join("?" * len(ids))
rows = conn.execute(f"SELECT message_id, emoji, user_id FROM message_reactions WHERE message_id IN ({placeholders})", ids).fetchall()
conn.close()
result = {}
for r in rows:
    mid = r["message_id"]
    if mid not in result:
        result[mid] = []
    result[mid].append({"emoji": r["emoji"], "user_id": r["user_id"]})
print(json.dumps({"reactions": result}))
`;
    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 10000 });
    return NextResponse.json(JSON.parse(stdout));
  } catch (e: any) {
    return NextResponse.json({ reactions: {}, error: e.message }, { status: 500 });
  }
}
