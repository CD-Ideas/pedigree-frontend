export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    return NextResponse.json(user);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
