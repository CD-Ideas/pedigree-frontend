export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import Database from "better-sqlite3";

const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";
let db: ReturnType<typeof Database> | null = null;
function getDb() {
  if (!db) { db = new Database(DB_PATH); db.pragma("journal_mode = WAL"); }
  return db;
}

async function getUser() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("session")?.value;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// GET — check if a user is blocked + get blocked list
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const blockedUserId = req.nextUrl.searchParams.get("user_id");
  const conn = getDb();

  if (blockedUserId) {
    // Check if specific user is blocked
    const row = conn.prepare(
      "SELECT id FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?"
    ).get(user.id, Number(blockedUserId));
    return NextResponse.json({ blocked: !!row });
  }

  // Get full blocked list
  const blocked = conn.prepare(
    `SELECT b.blocked_id, u.username, u.profile_picture
     FROM blocked_users b
     JOIN users u ON u.id = b.blocked_id
     WHERE b.blocker_id = ?
     ORDER BY b.created_at DESC`
  ).all(user.id);

  return NextResponse.json({ blocked });
}

// POST — block a user
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { blocked_id } = await req.json();
  if (!blocked_id || blocked_id === user.id) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  const conn = getDb();
  try {
    conn.prepare(
      "INSERT OR IGNORE INTO blocked_users (blocker_id, blocked_id) VALUES (?, ?)"
    ).run(user.id, blocked_id);
    return NextResponse.json({ success: true, blocked: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to block user" }, { status: 500 });
  }
}

// DELETE — unblock a user
export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const blocked_id = req.nextUrl.searchParams.get("blocked_id");
  if (!blocked_id) return NextResponse.json({ error: "Missing blocked_id" }, { status: 400 });

  const conn = getDb();
  conn.prepare(
    "DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?"
  ).run(user.id, Number(blocked_id));

  return NextResponse.json({ success: true, blocked: false });
}
