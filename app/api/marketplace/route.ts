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

const VALID_CATEGORIES = [
  "dogs_for_sale",
  "stud_service",
  "litters_for_sale",
  "supplies_gear",
  "courier_services",
  "puppies_wanted",
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const category = searchParams.get("category") || "";
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const sort = searchParams.get("sort") || "newest";
    const limit = 20;
    const offset = (page - 1) * limit;

    const categoryB64 = Buffer.from(category).toString("base64");
    const searchB64 = Buffer.from(search).toString("base64");

    const script = [
      `import sqlite3, json, base64`,
      `category = base64.b64decode("${categoryB64}").decode("utf-8")`,
      `search = base64.b64decode("${searchB64}").decode("utf-8")`,
      `conn = sqlite3.connect("${DB_PATH}")`,
      `conn.row_factory = sqlite3.Row`,
      `c = conn.cursor()`,
      `conditions = ["a.status = 'active'"]`,
      `params = []`,
      `if category:`,
      `    conditions.append("a.category = ?")`,
      `    params.append(category)`,
      `if search:`,
      `    conditions.append("(a.title LIKE ? OR a.description LIKE ?)")`,
      `    params.append("%" + search + "%")`,
      `    params.append("%" + search + "%")`,
      `where = "WHERE " + " AND ".join(conditions)`,
      `c.execute("SELECT COUNT(*) FROM marketplace_ads a " + where, params)`,
      `total = c.fetchone()[0]`,
      `sort_col = "created_at DESC" if "${sort}" == "newest" else "views DESC" if "${sort}" == "most_viewed" else "created_at DESC"`,
      `c.execute("SELECT a.id, a.user_id, a.category, a.title, a.description, a.price, a.photos, a.contact_phone, a.contact_email, a.contact_venmo, a.contact_paypal, a.dog_id, a.location, a.status, a.is_verified, a.is_paid, a.views, a.created_at, a.expires_at, u.username FROM marketplace_ads a LEFT JOIN users u ON a.user_id = u.id " + where + " ORDER BY a." + sort_col + " LIMIT ? OFFSET ?", params + [${limit}, ${offset}])`,
      `ads = [dict(r) for r in c.fetchall()]`,
      `for a in ads:`,
      `    try:`,
      `        a["photos"] = json.loads(a["photos"])`,
      `    except:`,
      `        a["photos"] = []`,
      `total_pages = (total + ${limit} - 1) // ${limit} if total > 0 else 1`,
      `print(json.dumps({"ads": ads, "total": total, "totalPages": total_pages, "page": ${page}}))`,
      `conn.close()`,
    ].join("\n");

    const stdout = await queryDb(script);
    const data = JSON.parse(stdout);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Marketplace GET error:", err);
    return NextResponse.json(
      { ads: [], total: 0, totalPages: 1, page: 1 },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      category,
      title,
      description,
      price,
      photos,
      contactPhone,
      contactEmail,
      contactVenmo,
      contactPaypal,
      dogId,
      location,
      isPaid,
      paymentTx,
    } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: "You must be logged in to create an ad" },
        { status: 401 }
      );
    }

    if (!title || title.length < 5 || title.length > 80) {
      return NextResponse.json(
        { error: "Title must be between 5 and 80 characters" },
        { status: 400 }
      );
    }

    if (!description || description.length < 10 || description.length > 500) {
      return NextResponse.json(
        { error: "Description must be between 10 and 500 characters" },
        { status: 400 }
      );
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    if (!location) {
      return NextResponse.json(
        { error: "Location is required" },
        { status: 400 }
      );
    }

    if (!contactPhone && !contactEmail && !contactVenmo && !contactPaypal) {
      return NextResponse.json(
        { error: "At least one contact method is required" },
        { status: 400 }
      );
    }

    const titleB64 = Buffer.from(title).toString("base64");
    const descB64 = Buffer.from(description).toString("base64");
    const priceB64 = Buffer.from(String(price ?? "")).toString("base64");
    const photosB64 = Buffer.from(JSON.stringify(photos || [])).toString("base64");
    const phoneB64 = Buffer.from(contactPhone || "").toString("base64");
    const emailB64 = Buffer.from(contactEmail || "").toString("base64");
    const venmoB64 = Buffer.from(contactVenmo || "").toString("base64");
    const paypalB64 = Buffer.from(contactPaypal || "").toString("base64");
    const locationB64 = Buffer.from(location).toString("base64");
    const paymentTxB64 = Buffer.from(paymentTx || "").toString("base64");

    const script = [
      `import sqlite3, json, base64`,
      `title = base64.b64decode("${titleB64}").decode("utf-8")`,
      `description = base64.b64decode("${descB64}").decode("utf-8")`,
      `price = base64.b64decode("${priceB64}").decode("utf-8") or None`,
      `photos = base64.b64decode("${photosB64}").decode("utf-8")`,
      `contact_phone = base64.b64decode("${phoneB64}").decode("utf-8") or None`,
      `contact_email = base64.b64decode("${emailB64}").decode("utf-8") or None`,
      `contact_venmo = base64.b64decode("${venmoB64}").decode("utf-8") or None`,
      `contact_paypal = base64.b64decode("${paypalB64}").decode("utf-8") or None`,
      `location = base64.b64decode("${locationB64}").decode("utf-8")`,
      `payment_tx = base64.b64decode("${paymentTxB64}").decode("utf-8") or None`,
      `user_id = ${parseInt(String(userId))}`,
      `category = "${category}"`,
      `dog_id = ${dogId ? parseInt(String(dogId)) : "None"}`,
      `is_paid = ${isPaid ? 1 : 0}`,
      `conn = sqlite3.connect("${DB_PATH}")`,
      `conn.row_factory = sqlite3.Row`,
      `c = conn.cursor()`,
      `# Check free post limit`,
      `c.execute("SELECT COUNT(*) FROM marketplace_ads WHERE user_id = ? AND is_paid = 0 AND status IN ('active', 'pending')", (user_id,))`,
      `free_count = c.fetchone()[0]`,
      `if free_count >= 2 and not is_paid:`,
      `    print(json.dumps({"error": "free_limit_reached", "message": "You have reached your free ad limit (2). Please purchase a paid listing to post more ads."}))`,
      `    conn.close()`,
      `    raise SystemExit(0)`,
      `c.execute("""`,
      `    INSERT INTO marketplace_ads (user_id, category, title, description, price, photos, contact_phone, contact_email, contact_venmo, contact_paypal, dog_id, location, is_paid, payment_tx)`,
      `    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      `""", (user_id, category, title, description, price, photos, contact_phone, contact_email, contact_venmo, contact_paypal, dog_id, location, is_paid, payment_tx))`,
      `conn.commit()`,
      `ad_id = c.lastrowid`,
      `print(json.dumps({"success": True, "id": ad_id}))`,
      `conn.close()`,
    ].join("\n");

    const stdout = await queryDb(script);
    const data = JSON.parse(stdout);

    if (data.error === "free_limit_reached") {
      return NextResponse.json(
        { error: data.message },
        { status: 402 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error("Marketplace POST error:", err);
    return NextResponse.json(
      { error: "Failed to create ad" },
      { status: 500 }
    );
  }
}
