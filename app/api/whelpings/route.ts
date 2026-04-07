export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB = process.env.SQLITE_DB_PATH || "/home/ubuntu/apbt-scraper/apbt_v2.db";

/* GET /api/whelpings?userId=X — list saved whelpings */
export async function GET(req: NextRequest) {
  try {
    const userId = parseInt(req.nextUrl.searchParams.get("userId") || "0", 10);
    if (!userId) return NextResponse.json({ whelpings: [] });

    const script = `
import sqlite3, json
conn = sqlite3.connect("${DB}")
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("SELECT * FROM saved_whelpings WHERE user_id = ? ORDER BY date_saved DESC", (${userId},))
rows = [dict(r) for r in cur.fetchall()]
conn.close()
print(json.dumps({"whelpings": rows}))
`;
    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 10000 });
    return NextResponse.json(JSON.parse(stdout));
  } catch (e: any) {
    console.error("GET whelpings error:", e);
    return NextResponse.json({ whelpings: [] });
  }
}

/* POST /api/whelpings — save a whelping */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, damName, damId, breedDate1, breedDate2, earliestDue, expectedDue, latestDue, note } = body;

    if (!userId || !damName || !breedDate1) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const script = `
import sqlite3, json, base64
conn = sqlite3.connect("${DB}")
cur = conn.cursor()
dam_name = base64.b64decode("${Buffer.from(damName).toString("base64")}").decode("utf-8")
note_val = base64.b64decode("${Buffer.from(note || "").toString("base64")}").decode("utf-8")
cur.execute("""
  INSERT INTO saved_whelpings (user_id, dam_name, dam_id, breed_date_1, breed_date_2, earliest_due, expected_due, latest_due, note)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
""", (${userId}, dam_name, ${damId || "None"}, "${breedDate1}", "${breedDate2 || ""}", "${earliestDue}", "${expectedDue}", "${latestDue}", note_val))
conn.commit()
print(json.dumps({"id": cur.lastrowid, "success": True}))
conn.close()
`;
    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 10000 });
    return NextResponse.json(JSON.parse(stdout));
  } catch (e: any) {
    console.error("POST whelpings error:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

/* PUT /api/whelpings — update an existing whelping */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, userId, damName, damId, breedDate1, breedDate2, earliestDue, expectedDue, latestDue, note } = body;

    if (!id || !userId || !damName || !breedDate1) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const script = `
import sqlite3, json, base64
conn = sqlite3.connect("${DB}")
cur = conn.cursor()
dam_name = base64.b64decode("${Buffer.from(damName).toString("base64")}").decode("utf-8")
note_val = base64.b64decode("${Buffer.from(note || "").toString("base64")}").decode("utf-8")
cur.execute("""
  UPDATE saved_whelpings SET dam_name = ?, dam_id = ?, breed_date_1 = ?, breed_date_2 = ?,
    earliest_due = ?, expected_due = ?, latest_due = ?, note = ?
  WHERE id = ? AND user_id = ?
""", (dam_name, ${damId || "None"}, "${breedDate1}", "${breedDate2 || ""}", "${earliestDue}", "${expectedDue}", "${latestDue}", note_val, ${id}, ${userId}))
conn.commit()
print(json.dumps({"updated": cur.rowcount, "success": True}))
conn.close()
`;
    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 10000 });
    return NextResponse.json(JSON.parse(stdout));
  } catch (e: any) {
    console.error("PUT whelpings error:", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

/* DELETE /api/whelpings — delete a whelping */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, userId } = body;
    if (!id || !userId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const script = `
import sqlite3, json
conn = sqlite3.connect("${DB}")
cur = conn.cursor()
cur.execute("DELETE FROM saved_whelpings WHERE id = ? AND user_id = ?", (${id}, ${userId}))
conn.commit()
print(json.dumps({"deleted": cur.rowcount}))
conn.close()
`;
    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 10000 });
    return NextResponse.json(JSON.parse(stdout));
  } catch (e: any) {
    console.error("DELETE whelpings error:", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
