export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

// GET /api/profile/[username]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    if (!username) {
      return NextResponse.json({ error: "username required" }, { status: 400 });
    }

    const script = `
import sqlite3, json, sys

username = sys.argv[1]
conn = sqlite3.connect("${DB_PATH}")
conn.row_factory = sqlite3.Row

# Fetch user
user_row = conn.execute(
    "SELECT id, username, profile_picture, role, created_at, last_active FROM users WHERE username = ?",
    (username,)
).fetchone()

if not user_row:
    print(json.dumps({"error": "User not found"}))
    conn.close()
    sys.exit(0)

user = dict(user_row)
user_id = user["id"]

# Fetch published pedigrees
pedigree_rows = conn.execute(
    "SELECT id, name, date_posted as created_at FROM published_pedigrees WHERE user_id = ? ORDER BY date_posted DESC",
    (user_id,)
).fetchall()
pedigrees = [dict(r) for r in pedigree_rows]

# Fetch active marketplace ads
ad_rows = conn.execute(
    "SELECT id, title, description, price, photos, created_at FROM marketplace_ads WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC",
    (user_id,)
).fetchall()
ads = [dict(r) for r in ad_rows]

result = {
    "user": user,
    "pedigrees": pedigrees,
    "ads": ads
}

conn.close()
print(json.dumps(result, default=str))
`;

    const { stdout } = await execFileAsync(
      "python3",
      ["-c", script, username],
      { timeout: 10000 }
    );
    const data = JSON.parse(stdout);
    if (data.error) {
      return NextResponse.json(data, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("Profile GET error:", e);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
