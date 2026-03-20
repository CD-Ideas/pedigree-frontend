export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DB_PATH = "/home/ubuntu/apbt-scraper/apbt_v2.db";

export async function POST(req: Request) {
  try {
    const { username } = await req.json();
    if (!username) return NextResponse.json({ message: "Username required" }, { status: 400 });

    const usernameB64 = Buffer.from(username).toString("base64");

    const script = `
import sqlite3, json, base64
username = base64.b64decode("${usernameB64}").decode("utf-8")
conn = sqlite3.connect("${DB_PATH}")
c = conn.cursor()
c.execute("DELETE FROM users WHERE LOWER(username) = LOWER(?)", (username,))
deleted = c.rowcount
conn.commit()
conn.close()
print(json.dumps({"success": deleted > 0, "message": "Account deleted" if deleted > 0 else "Account not found"}))
`;

    const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 10000 });
    const data = JSON.parse(stdout);
    return NextResponse.json(data, { status: data.success ? 200 : 404 });
  } catch (_e) {
    return NextResponse.json({ message: "Failed to delete account" }, { status: 500 });
  }
}
