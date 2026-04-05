export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB = process.env.SQLITE_DB_PATH || "/home/ubuntu/apbt-scraper/apbt_v2.db";

export async function POST(req: NextRequest) {
  try {
    const { userId, alertId, readAll } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    let script: string;
    if (readAll) {
      script = `
import sqlite3
db = sqlite3.connect("${DB}")
cur = db.cursor()
cur.execute("SELECT id FROM published_pedigrees WHERE show_in_title_feed = 1")
ids = [r[0] for r in cur.fetchall()]
for aid in ids:
    cur.execute("INSERT OR IGNORE INTO title_alert_reads (user_id, alert_id) VALUES (?, ?)", (${userId}, aid))
db.commit()
db.close()
print("ok")
`;
    } else if (alertId) {
      script = `
import sqlite3
db = sqlite3.connect("${DB}")
db.execute("INSERT OR IGNORE INTO title_alert_reads (user_id, alert_id) VALUES (?, ?)", (${userId}, ${alertId}))
db.commit()
db.close()
print("ok")
`;
    } else {
      return NextResponse.json({ error: "alertId or readAll required" }, { status: 400 });
    }

    await execFileAsync("python3", ["-c", script], { timeout: 10000 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Mark read error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
