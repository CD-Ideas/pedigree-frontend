export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = process.env.SQLITE_DB_PATH || "/home/ubuntu/apbt-scraper/apbt_v2.db";

async function queryDb(script: string): Promise<string> {
  const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 15000 });
  return stdout;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "50"));
    const offset = (page - 1) * limit;
    const sort = searchParams.get("sort") || "view_count";
    const order = searchParams.get("order") === "asc" ? "ASC" : "DESC";
    const search = searchParams.get("search") || searchParams.get("q") || "";
    const sex = searchParams.get("sex") || "";
    const color = searchParams.get("color") || "";
    const title = searchParams.get("title") || "";
    const hasPhoto = searchParams.get("hasPhoto") === "true";

    const searchB64 = Buffer.from(search).toString("base64");
    const colorB64 = Buffer.from(color).toString("base64");
    const titleB64 = Buffer.from(title).toString("base64");

    const sortMap: Record<string, string> = { name: "registered_name", id: "dog_id", added: "posted_date", dob: "birthdate" };
    const sortCol = sortMap[sort] || (["view_count", "registered_name", "dog_id", "birthdate", "posted_date"].includes(sort) ? sort : "view_count");

    const script = [
      `import sqlite3, json, base64, re, sys`,
      `search = base64.b64decode("${searchB64}").decode("utf-8")`,
      `color_f = base64.b64decode("${colorB64}").decode("utf-8")`,
      `title_f = base64.b64decode("${titleB64}").decode("utf-8")`,
      `conn = sqlite3.connect("${DB_PATH}")`,
      `conn.row_factory = sqlite3.Row`,
      `c = conn.cursor()`,
      `conditions = []`,
      `params = []`,
      `search = search.replace("\\u2019", "'").replace("\\u2018", "'").replace("  ", " ")`,
      `if search:`,
      `    words = search.split()`,
      `    for w in words:`,
      `        conditions.append("registered_name LIKE ?")`,
      `        params.append("%" + w + "%")`,
      `sex_f = "${sex}"`,
      `if sex_f:`,
      `    conditions.append("UPPER(sex) = UPPER(?)")`,
      `    params.append(sex_f)`,
      `if color_f:`,
      `    conditions.append("color = ?")`,
      `    params.append(color_f)`,
      `if title_f == "all":`,
      `    conditions.append("(registered_name LIKE '%CH %' OR registered_name LIKE '%GR CH%' OR registered_name LIKE '%ROM%' OR registered_name LIKE '%XW%' OR registered_name LIKE '%XL%' OR registered_name LIKE '%POR%')")`,
      `elif title_f:`,
      `    conditions.append("registered_name LIKE ?")`,
      `    params.append("%" + title_f + "%")`,
      `has_photo = ${hasPhoto ? "True" : "False"}`,
      `if has_photo:`,
      `    conditions.append("photo_url IS NOT NULL AND photo_url != ''")`,
      `where = "WHERE " + " AND ".join(conditions) if conditions else ""`,
      `c.execute("SELECT COUNT(*) FROM dogs " + where, params)`,
      `total = c.fetchone()[0]`,
      `sort_col = "${sortCol}"`,
      `sort_order = "${order}"`,
      `lim = ${limit}`,
      `off = ${offset}`,
      `c.execute("SELECT dog_id as id, registered_name as name, sex, color, birthdate as dob, registration_number as reg_number, photo_url as profile_image_url, sire_id, dam_id, view_count FROM dogs " + where + " ORDER BY " + sort_col + " " + sort_order + " LIMIT ? OFFSET ?", params + [lim, off])`,
      `dogs = []`,
      `for r in c.fetchall():`,
      `    d = dict(r)`,
      `    d["titles"] = []`,
      `    nm = (d.get("name") or "").upper()`,
      `    if "GR CH" in nm: d["titles"].append("GR CH")`,
      `    if " CH " in nm or nm.startswith("CH "): d["titles"].append("CH")`,
      `    if "ROM" in nm: d["titles"].append("ROM")`,
      `    xw = re.findall(r"\\b(\\d+)X[WL]\\b", nm)`,
      `    for x in xw: d["titles"].append(x + "XW")`,
      `    dogs.append(d)`,
      `total_pages = (total + lim - 1) // lim`,
      
      `print(json.dumps({"dogs": dogs, "total": total, "totalPages": total_pages, "page": ${page}, "filters": {"colors": [], "titles": ["GR CH","CH","ROM","POR","1XW","2XW","3XW","4XW","5XW"]}}))`,
      `conn.close()`,
    ].join("\n");

    const stdout = await queryDb(script);
    const data = JSON.parse(stdout);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Dogs API error:", err);
    return NextResponse.json({ dogs: [], total: 0, totalPages: 0, page: 1, filters: { colors: [], titles: [] } });
  }
}
