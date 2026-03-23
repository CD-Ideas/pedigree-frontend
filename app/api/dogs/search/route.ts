export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";

const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

let db: ReturnType<typeof Database> | null = null;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true });
    db.pragma("journal_mode = WAL");
    db.pragma("cache_size = -20000"); // 20MB cache
  }
  return db;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 10, 20);

  if (q.length < 2) {
    return NextResponse.json({ dogs: [] });
  }

  try {
    const conn = getDb();

    // Try prefix match first (uses index, very fast)
    let dogs = conn.prepare(
      "SELECT dog_id, registered_name, photo_url, sex FROM dogs WHERE registered_name LIKE ? ORDER BY view_count DESC LIMIT ?"
    ).all(q + '%', limit) as { dog_id: number; registered_name: string; photo_url: string | null; sex: string }[];

    // If not enough results, fall back to contains match
    if (dogs.length < limit) {
      dogs = conn.prepare(
        "SELECT dog_id, registered_name, photo_url, sex FROM dogs WHERE registered_name LIKE ? ORDER BY view_count DESC LIMIT ?"
      ).all('%' + q + '%', limit) as { dog_id: number; registered_name: string; photo_url: string | null; sex: string }[];
    }

    return NextResponse.json({ dogs });
  } catch (_e) {
    // If better-sqlite3 fails, reset connection
    db = null;
    return NextResponse.json({ dogs: [] });
  }
}
