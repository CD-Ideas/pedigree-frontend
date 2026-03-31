export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = process.env.SQLITE_DB_PATH || "/home/ubuntu/apbt-scraper/apbt_v2.db";

async function queryDb(script: string): Promise<string> {
  const { stdout } = await execFileAsync("python3", ["-c", script], {
    timeout: 15000,
  });
  return stdout;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      return NextResponse.json(
        { error: "Invalid userId" },
        { status: 400 }
      );
    }

    const script = [
      `import sqlite3, json`,
      `conn = sqlite3.connect("${DB_PATH}")`,
      `conn.row_factory = sqlite3.Row`,
      `c = conn.cursor()`,
      `c.execute("SELECT id, user_id, category, title, description, price, photos, contact_phone, contact_email, contact_venmo, contact_paypal, dog_id, location, status, is_verified, is_paid, views, created_at, expires_at FROM marketplace_ads WHERE user_id = ? ORDER BY created_at DESC", (${userIdInt},))`,
      `ads = [dict(r) for r in c.fetchall()]`,
      `for a in ads:`,
      `    try:`,
      `        a["photos"] = json.loads(a["photos"])`,
      `    except:`,
      `        a["photos"] = []`,
      `print(json.dumps({"ads": ads, "total": len(ads)}))`,
      `conn.close()`,
    ].join("\n");

    const stdout = await queryDb(script);
    const data = JSON.parse(stdout);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Marketplace my-ads error:", err);
    return NextResponse.json(
      { ads: [], total: 0 },
      { status: 500 }
    );
  }
}
