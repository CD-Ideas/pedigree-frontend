export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { querySqlite } from "@/app/lib/safe-query";

// GET /api/users/search?q=username_prefix&limit=10
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const q = req.nextUrl.searchParams.get("q") || "";
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "10"), 20);

    if (q.length < 1) {
      return NextResponse.json({ users: [] });
    }

    const rows = await querySqlite(
      `SELECT id, username, profile_picture
       FROM users
       WHERE username LIKE ? AND id != ?
       ORDER BY username ASC
       LIMIT ?`,
      [`${q}%`, user.id, limit]
    );

    return NextResponse.json({ users: rows });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    console.error("User search error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
