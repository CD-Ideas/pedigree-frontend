export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const userId = parseInt(formData.get("userId") as string, 10);
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const file = formData.get("avatar") as File | null;
    if (!file || file.size === 0) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `avatar_${userId}_${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);
    const avatarPath = `/uploads/avatars/${filename}`;

    const script = `
import sqlite3, json
conn = sqlite3.connect("${DB_PATH}")
conn.execute("UPDATE users SET profile_picture = ? WHERE id = ?", ("${avatarPath}", ${userId}))
conn.commit()
conn.close()
print(json.dumps({"success": True, "profile_picture": "${avatarPath}"}))
`;

    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 10000 });
    const data = JSON.parse(stdout);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 });
  }
}
