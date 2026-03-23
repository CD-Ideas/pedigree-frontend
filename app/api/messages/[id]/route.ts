export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

// PUT /api/messages/[id] — mark as read
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const script = `
import sqlite3, json, sys
msg_id = int(sys.argv[1])
user_id = int(sys.argv[2])
conn = sqlite3.connect("${DB_PATH}")
conn.execute("UPDATE messages SET is_read = 1 WHERE id = ? AND to_user_id = ?", (msg_id, user_id))
conn.commit()
conn.close()
print(json.dumps({"success": True}))
`;

    const { stdout } = await execFileAsync("python3", ["-c", script, id, String(userId)], { timeout: 10000 });
    return NextResponse.json(JSON.parse(stdout));
  } catch (e) {
    console.error("Message PUT error:", e);
    return NextResponse.json({ error: "Failed to update message" }, { status: 500 });
  }
}

// DELETE /api/messages/[id] — delete a message
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const script = `
import sqlite3, json, sys
msg_id = int(sys.argv[1])
user_id = int(sys.argv[2])
conn = sqlite3.connect("${DB_PATH}")
# Only delete if you're sender or recipient
deleted = conn.execute("DELETE FROM messages WHERE id = ? AND (from_user_id = ? OR to_user_id = ?)", (msg_id, user_id, user_id)).rowcount
conn.commit()
conn.close()
print(json.dumps({"success": True, "deleted": deleted}))
`;

    const { stdout } = await execFileAsync("python3", ["-c", script, id, userId], { timeout: 10000 });
    return NextResponse.json(JSON.parse(stdout));
  } catch (e) {
    console.error("Message DELETE error:", e);
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}
