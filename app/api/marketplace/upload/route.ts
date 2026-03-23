export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { promisify } from "util";
import { execFile } from "child_process";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("photo") as File | null;
    if (!file || file.size === 0) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) return NextResponse.json({ error: "Invalid file type" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `marketplace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "marketplace");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    // Auto-rotate based on EXIF
    try {
      await execFileAsync("python3", ["-c", `
from PIL import Image, ImageOps
import sys
img = Image.open(sys.argv[1])
img = ImageOps.exif_transpose(img)
img.save(sys.argv[1])
`, path.join(uploadDir, filename)], { timeout: 10000 });
    } catch (_e) {}

    const photoPath = `/uploads/marketplace/${filename}`;

    return NextResponse.json({ success: true, path: photoPath });
  } catch (_e) {
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
  }
}
