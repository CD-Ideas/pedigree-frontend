export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import crypto from "crypto";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

// POST — save a prediction
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, sireName, damName, sireDogId, damDogId, sireGenotype, damGenotype, resultsJson, litterSimulation } = body;

    const shareId = crypto.randomBytes(6).toString("hex");
    const dataB64 = Buffer.from(JSON.stringify({
      shareId,
      userId: userId || null,
      sireName: sireName || null,
      damName: damName || null,
      sireDogId: sireDogId || null,
      damDogId: damDogId || null,
      sireGenotype,
      damGenotype,
      resultsJson,
      litterSimulation: litterSimulation || null,
    })).toString("base64");

    const script = `
import sqlite3, json, base64
data = json.loads(base64.b64decode("${dataB64}").decode("utf-8"))
conn = sqlite3.connect("${DB_PATH}")
conn.execute("""INSERT INTO color_predictions (share_id, user_id, sire_name, dam_name, sire_dog_id, dam_dog_id, sire_genotype, dam_genotype, results_json, litter_simulation)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", (
  data["shareId"], data["userId"], data["sireName"], data["damName"],
  data["sireDogId"], data["damDogId"],
  json.dumps(data["sireGenotype"]), json.dumps(data["damGenotype"]),
  json.dumps(data["resultsJson"]),
  json.dumps(data["litterSimulation"]) if data["litterSimulation"] else None
))
conn.commit()
conn.close()
print(json.dumps({"shareId": data["shareId"]}))
`;
    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 10000 });
    return NextResponse.json(JSON.parse(stdout));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET — load prediction by shareId OR get history for user
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shareId = searchParams.get("shareId");
    const userId = searchParams.get("userId");

    if (shareId) {
      const shareB64 = Buffer.from(shareId).toString("base64");
      const script = `
import sqlite3, json, base64
share_id = base64.b64decode("${shareB64}").decode("utf-8")
conn = sqlite3.connect("${DB_PATH}")
conn.row_factory = sqlite3.Row
row = conn.execute("SELECT * FROM color_predictions WHERE share_id = ?", (share_id,)).fetchone()
conn.close()
if row:
    d = dict(row)
    d["sire_genotype"] = json.loads(d["sire_genotype"])
    d["dam_genotype"] = json.loads(d["dam_genotype"])
    d["results_json"] = json.loads(d["results_json"])
    d["litter_simulation"] = json.loads(d["litter_simulation"]) if d["litter_simulation"] else None
    print(json.dumps(d))
else:
    print(json.dumps({"error": "not_found"}))
`;
      const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 10000 });
      const data = JSON.parse(stdout);
      if (data.error) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(data);
    }

    if (userId) {
      const script = `
import sqlite3, json
conn = sqlite3.connect("${DB_PATH}")
conn.row_factory = sqlite3.Row
rows = conn.execute("SELECT share_id, sire_name, dam_name, sire_dog_id, dam_dog_id, created_at FROM color_predictions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20", (${Number(userId)},)).fetchall()
conn.close()
print(json.dumps([dict(r) for r in rows]))
`;
      const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 10000 });
      return NextResponse.json({ history: JSON.parse(stdout) });
    }

    return NextResponse.json({ error: "Provide shareId or userId" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE — clear all predictions for a user
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const script = `
import sqlite3, json
conn = sqlite3.connect("${DB_PATH}")
deleted = conn.execute("DELETE FROM color_predictions WHERE user_id = ?", (${Number(userId)},)).rowcount
conn.commit()
conn.close()
print(json.dumps({"deleted": deleted}))
`;
    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 10000 });
    return NextResponse.json(JSON.parse(stdout));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
