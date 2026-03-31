export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const safeName = path.basename(filename);

    // Validate filename characters (alphanumeric, dots, hyphens, underscores)
    if (!/^[a-zA-Z0-9._-]+$/.test(safeName)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Validate extension
    const ext = safeName.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Pedigree photos are stored directly in public/uploads/ (e.g. ped_1234567890.jpg)
    const filePath = path.join(process.cwd(), "public", "uploads", safeName);
    const data = await readFile(filePath);

    const contentType = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/jpeg";

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
