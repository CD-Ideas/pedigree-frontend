export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

async function queryDb(script: string): Promise<string> {
  const { stdout } = await execFileAsync("python3", ["-c", script], {
    timeout: 15000,
  });
  return stdout;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adId = parseInt(id, 10);
    if (isNaN(adId)) {
      return NextResponse.json({ error: "Invalid ad ID" }, { status: 400 });
    }

    const script = [
      `import sqlite3, json`,
      `conn = sqlite3.connect("${DB_PATH}")`,
      `conn.row_factory = sqlite3.Row`,
      `c = conn.cursor()`,
      `# Increment view count`,
      `c.execute("UPDATE marketplace_ads SET views = views + 1 WHERE id = ?", (${adId},))`,
      `conn.commit()`,
      `c.execute("SELECT a.id, a.user_id, a.category, a.title, a.description, a.price, a.photos, a.contact_phone, a.contact_email, a.contact_venmo, a.contact_paypal, a.dog_id, a.location, a.status, a.is_verified, a.is_paid, a.verification_requested, a.verified_at, a.verified_by, a.views, a.created_at, a.expires_at, u.username FROM marketplace_ads a LEFT JOIN users u ON a.user_id = u.id WHERE a.id = ?", (${adId},))`,
      `row = c.fetchone()`,
      `if not row:`,
      `    print(json.dumps({"error": "not_found"}))`,
      `    conn.close()`,
      `    raise SystemExit(0)`,
      `ad = dict(row)`,
      `try:`,
      `    ad["photos"] = json.loads(ad["photos"])`,
      `except:`,
      `    ad["photos"] = []`,
      `print(json.dumps(ad))`,
      `conn.close()`,
    ].join("\n");

    const stdout = await queryDb(script);
    const data = JSON.parse(stdout);

    if (data.error === "not_found") {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Marketplace GET [id] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch ad" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adId = parseInt(id, 10);
    if (isNaN(adId)) {
      return NextResponse.json({ error: "Invalid ad ID" }, { status: 400 });
    }

    const body = await req.json();
    const { userId, title, description, price, photos, contactPhone, contactEmail, contactVenmo, contactPaypal, location } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "You must be logged in to edit an ad" },
        { status: 401 }
      );
    }

    if (title !== undefined && (title.length < 5 || title.length > 80)) {
      return NextResponse.json(
        { error: "Title must be between 5 and 80 characters" },
        { status: 400 }
      );
    }

    if (description !== undefined && (description.length < 10 || description.length > 500)) {
      return NextResponse.json(
        { error: "Description must be between 10 and 500 characters" },
        { status: 400 }
      );
    }

    // Build update fields dynamically
    const fields: { col: string; valB64: string }[] = [];
    if (title !== undefined) fields.push({ col: "title", valB64: Buffer.from(title).toString("base64") });
    if (description !== undefined) fields.push({ col: "description", valB64: Buffer.from(description).toString("base64") });
    if (price !== undefined) fields.push({ col: "price", valB64: Buffer.from(price || "").toString("base64") });
    if (photos !== undefined) fields.push({ col: "photos", valB64: Buffer.from(JSON.stringify(photos)).toString("base64") });
    if (contactPhone !== undefined) fields.push({ col: "contact_phone", valB64: Buffer.from(contactPhone || "").toString("base64") });
    if (contactEmail !== undefined) fields.push({ col: "contact_email", valB64: Buffer.from(contactEmail || "").toString("base64") });
    if (contactVenmo !== undefined) fields.push({ col: "contact_venmo", valB64: Buffer.from(contactVenmo || "").toString("base64") });
    if (contactPaypal !== undefined) fields.push({ col: "contact_paypal", valB64: Buffer.from(contactPaypal || "").toString("base64") });
    if (location !== undefined) fields.push({ col: "location", valB64: Buffer.from(location).toString("base64") });

    if (fields.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const decodeLines = fields.map(
      (f) => `fields["${f.col}"] = base64.b64decode("${f.valB64}").decode("utf-8")${f.col === "price" || f.col.startsWith("contact_") ? " or None" : ""}`
    );
    const setClauses = fields.map((f) => `"${f.col} = ?"`).join(", ");
    const valsList = fields.map((f) => `fields["${f.col}"]`).join(", ");

    const script = [
      `import sqlite3, json, base64`,
      `conn = sqlite3.connect("${DB_PATH}")`,
      `conn.row_factory = sqlite3.Row`,
      `c = conn.cursor()`,
      `# Check ownership`,
      `c.execute("SELECT user_id FROM marketplace_ads WHERE id = ?", (${adId},))`,
      `row = c.fetchone()`,
      `if not row:`,
      `    print(json.dumps({"error": "not_found"}))`,
      `    conn.close()`,
      `    raise SystemExit(0)`,
      `if row["user_id"] != ${parseInt(String(userId))}:`,
      `    print(json.dumps({"error": "forbidden"}))`,
      `    conn.close()`,
      `    raise SystemExit(0)`,
      `fields = {}`,
      ...decodeLines,
      `set_clause = ", ".join([${setClauses}])`,
      `vals = [${valsList}]`,
      `vals.append(${adId})`,
      `c.execute("UPDATE marketplace_ads SET " + set_clause + " WHERE id = ?", vals)`,
      `conn.commit()`,
      `print(json.dumps({"success": True}))`,
      `conn.close()`,
    ].join("\n");

    const stdout = await queryDb(script);
    const data = JSON.parse(stdout);

    if (data.error === "not_found") {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }
    if (data.error === "forbidden") {
      return NextResponse.json(
        { error: "You can only edit your own ads" },
        { status: 403 }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Marketplace PUT error:", err);
    return NextResponse.json(
      { error: "Failed to update ad" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adId = parseInt(id, 10);
    if (isNaN(adId)) {
      return NextResponse.json({ error: "Invalid ad ID" }, { status: 400 });
    }

    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "You must be logged in to delete an ad" },
        { status: 401 }
      );
    }

    const script = [
      `import sqlite3, json`,
      `conn = sqlite3.connect("${DB_PATH}")`,
      `conn.row_factory = sqlite3.Row`,
      `c = conn.cursor()`,
      `c.execute("SELECT user_id FROM marketplace_ads WHERE id = ?", (${adId},))`,
      `row = c.fetchone()`,
      `if not row:`,
      `    print(json.dumps({"error": "not_found"}))`,
      `    conn.close()`,
      `    raise SystemExit(0)`,
      `if row["user_id"] != ${parseInt(String(userId))}:`,
      `    print(json.dumps({"error": "forbidden"}))`,
      `    conn.close()`,
      `    raise SystemExit(0)`,
      `c.execute("DELETE FROM marketplace_ads WHERE id = ?", (${adId},))`,
      `conn.commit()`,
      `print(json.dumps({"success": True}))`,
      `conn.close()`,
    ].join("\n");

    const stdout = await queryDb(script);
    const data = JSON.parse(stdout);

    if (data.error === "not_found") {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }
    if (data.error === "forbidden") {
      return NextResponse.json(
        { error: "You can only delete your own ads" },
        { status: 403 }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Marketplace DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete ad" },
      { status: 500 }
    );
  }
}
