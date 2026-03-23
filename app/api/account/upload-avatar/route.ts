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
    const tempName = `avatar_raw_${userId}_${Date.now()}`;
    const finalName = `avatar_${userId}_${Date.now()}.jpg`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
    await mkdir(uploadDir, { recursive: true });

    // Save raw file first
    const rawPath = path.join(uploadDir, tempName);
    const finalPath = path.join(uploadDir, finalName);
    await writeFile(rawPath, buffer);

    // Use Python/Pillow to auto-crop center square and resize to 200x200
    const cropScript = `
import sys
from PIL import Image
import os

raw = sys.argv[1]
out = sys.argv[2]

img = Image.open(raw)
img = img.convert("RGB")

# Center crop to square
w, h = img.size
size = min(w, h)
left = (w - size) // 2
top = (h - size) // 2
img = img.crop((left, top, left + size, top + size))

# Resize to 200x200
img = img.resize((200, 200), Image.LANCZOS)

# Save as JPEG
img.save(out, "JPEG", quality=90)

# Remove raw file
os.remove(raw)

print("OK")
`;

    await execFileAsync("python3", ["-c", cropScript, rawPath, finalPath], { timeout: 15000 });

    const avatarPath = `/api/uploads/avatars/${finalName}`;

    const dbScript = `
import sqlite3, json, sys
avatar_path = sys.argv[1]
user_id = int(sys.argv[2])
conn = sqlite3.connect("${DB_PATH}")
conn.execute("UPDATE users SET profile_picture = ? WHERE id = ?", (avatar_path, user_id))
conn.commit()
conn.close()
print(json.dumps({"success": True, "profile_picture": avatar_path}))
`;

    const { stdout } = await execFileAsync("python3", ["-c", dbScript, avatarPath, String(userId)], { timeout: 10000 });
    const data = JSON.parse(stdout);
    return NextResponse.json(data);
  } catch (_e) {
    console.error("Avatar upload error:", _e);
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 });
  }
}
