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

// GET — get current active status
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const conn = getDb();
  const row = conn.prepare("SELECT show_online FROM users WHERE id = ?").get(user.id) as any;

  // Default to true if column doesn't exist or is null
  const active = row?.show_online !== 0;
  return NextResponse.json({ active_status: active });
}

// POST — update active status
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { active_status } = await req.json();
  const conn = getDb();

  conn.prepare("UPDATE users SET show_online = ? WHERE id = ?").run(active_status ? 1 : 0, user.id);

  return NextResponse.json({ success: true, active_status });
}
