export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

/**
 * GET /api/dogs/family?id=123
 * Returns the dog + its sire & dam (one level of parents).
 */
export async function GET(req: NextRequest) {
  const dogId = Number(req.nextUrl.searchParams.get("id"));
  if (!dogId || isNaN(dogId)) {
    return NextResponse.json({ dog: null, sire: null, dam: null });
  }

  try {
    const script = `
import sqlite3, json
conn = sqlite3.connect("${DB_PATH}")
conn.row_factory = sqlite3.Row
c = conn.cursor()

def get_dog(did):
    if not did:
        return None
    c.execute("SELECT dog_id, registered_name, photo_url, sex, sire_id, dam_id FROM dogs WHERE dog_id = ?", (did,))
    row = c.fetchone()
    return dict(row) if row else None

dog = get_dog(${dogId})
sire = get_dog(dog["sire_id"]) if dog and dog.get("sire_id") else None
dam = get_dog(dog["dam_id"]) if dog and dog.get("dam_id") else None

conn.close()
print(json.dumps({"dog": dog, "sire": sire, "dam": dam}))
`;
    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 10000 });
    const data = JSON.parse(stdout || '{"dog":null,"sire":null,"dam":null}');
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ dog: null, sire: null, dam: null });
  }
}
