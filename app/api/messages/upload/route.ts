export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const userId = parseInt(formData.get("userId") as string, 10);
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split(".").pop() || "bin";
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `msg_${userId}_${Date.now()}_${safeName}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "messages");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    const filePath = `/api/uploads/messages/${filename}`;
    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);

    return NextResponse.json({
      success: true,
      url: filePath,
      name: file.name,
      size: file.size,
      isImage,
    });
  } catch (_e) {
    console.error("Message upload error:", _e);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
