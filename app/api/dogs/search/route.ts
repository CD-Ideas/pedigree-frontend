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

    let dogs: { dog_id: number; registered_name: string; photo_url: string | null; sex: string }[] = [];

    // 1. Try FTS5 first (fast, 2ms)
    const ftsQuery = q.replace(/['"]/g, '').split(/\s+/).map(w => `"${w}"*`).join(' ');
    try {
      dogs = conn.prepare(
        `SELECT d.dog_id, d.registered_name, d.photo_url, d.sex
         FROM dogs_fts f
         JOIN dogs d ON f.rowid = d.dog_id
         WHERE dogs_fts MATCH ?
         ORDER BY d.view_count DESC
         LIMIT ?`
      ).all(ftsQuery, limit) as typeof dogs;
    } catch (_ftsErr) {
      // FTS failed, will fall through to LIKE
    }

    // 2. If FTS returned few results, supplement with LIKE search
    //    Handles apostrophes (BWK'S), special chars, and partial matches
    if (dogs.length < limit) {
      const existing = new Set(dogs.map(d => d.dog_id));
      const likeResults = conn.prepare(
        "SELECT dog_id, registered_name, photo_url, sex FROM dogs WHERE registered_name LIKE ? ORDER BY view_count DESC LIMIT ?"
      ).all('%' + q + '%', limit) as typeof dogs;

      for (const d of likeResults) {
        if (!existing.has(d.dog_id) && dogs.length < limit) {
          dogs.push(d);
          existing.add(d.dog_id);
        }
      }
    }

    // 3. If still no results, try fuzzy/similar search by splitting words
    //    e.g. "BWK'S BLACK RAGE" → search for dogs matching "BWK" AND "BLACK", or "BWK" AND "RAGE"
    let suggestions: typeof dogs = [];
    if (dogs.length === 0) {
      const words = q.replace(/['"]/g, '').split(/\s+/).filter(w => w.length >= 2);
      if (words.length >= 2) {
        // Try each pair of words
        const existing = new Set<number>();
        for (let i = 0; i < words.length && suggestions.length < limit; i++) {
          for (let j = i + 1; j < words.length && suggestions.length < limit; j++) {
            const results = conn.prepare(
              "SELECT dog_id, registered_name, photo_url, sex FROM dogs WHERE registered_name LIKE ? AND registered_name LIKE ? ORDER BY view_count DESC LIMIT ?"
            ).all('%' + words[i] + '%', '%' + words[j] + '%', limit) as typeof dogs;
            for (const d of results) {
              if (!existing.has(d.dog_id) && suggestions.length < limit) {
                suggestions.push(d);
                existing.add(d.dog_id);
              }
            }
          }
        }
        // If still nothing, try individual words
        if (suggestions.length === 0) {
          for (const word of words) {
            if (suggestions.length >= limit) break;
            const results = conn.prepare(
              "SELECT dog_id, registered_name, photo_url, sex FROM dogs WHERE registered_name LIKE ? ORDER BY view_count DESC LIMIT ?"
            ).all('%' + word + '%', limit - suggestions.length) as typeof dogs;
            for (const d of results) {
              if (!existing.has(d.dog_id) && suggestions.length < limit) {
                suggestions.push(d);
                existing.add(d.dog_id);
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ dogs, suggestions });
  } catch (_e) {
    // If better-sqlite3 fails, reset connection
    db = null;
    return NextResponse.json({ dogs: [] });
  }
}
