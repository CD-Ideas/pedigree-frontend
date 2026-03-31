import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const DB_PATH = process.env.SQLITE_DB_PATH || "/home/ubuntu/apbt-scraper/apbt_v2.db";

// JSON-compatible types for SQLite query results at the system boundary
// SQLite row type: permissive enough for property access, strict enough for type safety
type SqliteRow = Record<string, string | number | null>;

export async function querySqlite(sql: string, params: (string | number | null)[], options: { timeout?: number; single: true }): Promise<SqliteRow | null>;
export async function querySqlite(sql: string, params?: (string | number | null)[], options?: { timeout?: number; single?: false }): Promise<SqliteRow[]>;
export async function querySqlite(sql: string, params?: (string | number | null)[], options?: { timeout?: number; single?: boolean }): Promise<SqliteRow | SqliteRow[] | null>;
export async function querySqlite(
  sql: string,
  params: (string | number | null)[] = [],
  options: { timeout?: number; single?: boolean } = {}
): Promise<SqliteRow | SqliteRow[] | null> {
  const { timeout = 15000, single = false } = options;

  const script = `
import sqlite3, json, sys, base64

db_path = base64.b64decode(sys.argv[1]).decode()
sql = base64.b64decode(sys.argv[2]).decode()
params = json.loads(base64.b64decode(sys.argv[3]).decode())
single = sys.argv[4] == "1"

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute(sql, params)
rows = [dict(r) for r in cur.fetchall()]
conn.close()

if single:
    print(json.dumps(rows[0] if rows else None))
else:
    print(json.dumps(rows))
`;

  const args = [
    "-c", script,
    Buffer.from(DB_PATH).toString("base64"),
    Buffer.from(sql).toString("base64"),
    Buffer.from(JSON.stringify(params)).toString("base64"),
    single ? "1" : "0"
  ];

  const { stdout, stderr } = await execFileAsync("python3", args, { timeout });

  if (stderr && stderr.trim()) {
    console.error("[sqlite-query] stderr:", stderr.trim());
  }

  return JSON.parse(stdout);
}

export async function executeSqlite(
  sql: string,
  params: (string | number | null)[] = [],
  options: { timeout?: number } = {}
): Promise<{ rowsAffected: number }> {
  const { timeout = 15000 } = options;

  const script = `
import sqlite3, json, sys, base64

db_path = base64.b64decode(sys.argv[1]).decode()
sql = base64.b64decode(sys.argv[2]).decode()
params = json.loads(base64.b64decode(sys.argv[3]).decode())

conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute(sql, params)
conn.commit()
rows_affected = cur.rowcount
conn.close()

print(json.dumps({"rowsAffected": rows_affected}))
`;

  const args = [
    "-c", script,
    Buffer.from(DB_PATH).toString("base64"),
    Buffer.from(sql).toString("base64"),
    Buffer.from(JSON.stringify(params)).toString("base64"),
  ];

  const { stdout } = await execFileAsync("python3", args, { timeout });
  return JSON.parse(stdout);
}

export async function executeSqliteReturning(
  sql: string,
  params: (string | number | null)[] = [],
  options: { timeout?: number } = {}
): Promise<SqliteRow[]> {
  const { timeout = 15000 } = options;

  const script = `
import sqlite3, json, sys, base64

db_path = base64.b64decode(sys.argv[1]).decode()
sql = base64.b64decode(sys.argv[2]).decode()
params = json.loads(base64.b64decode(sys.argv[3]).decode())

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute(sql, params)
rows = [dict(r) for r in cur.fetchall()]
conn.commit()
conn.close()

print(json.dumps(rows))
`;

  const args = [
    "-c", script,
    Buffer.from(DB_PATH).toString("base64"),
    Buffer.from(sql).toString("base64"),
    Buffer.from(JSON.stringify(params)).toString("base64"),
  ];

  const { stdout } = await execFileAsync("python3", args, { timeout });
  return JSON.parse(stdout);
}

/**
 * Run an arbitrary Python script with base64-encoded arguments.
 * All user data is passed via base64-encoded argv, never interpolated.
 */
export async function runPythonScript(
  script: string,
  scriptArgs: string[] = [],
  options: { timeout?: number; maxBuffer?: number } = {}
): Promise<SqliteRow> {
  const { timeout = 15000, maxBuffer = 10 * 1024 * 1024 } = options;

  const args = ["-c", script, ...scriptArgs];
  const { stdout, stderr } = await execFileAsync("python3", args, { timeout, maxBuffer });

  if (stderr && stderr.trim()) {
    console.error("[python-script] stderr:", stderr.trim());
  }

  return JSON.parse(stdout) as SqliteRow;
}
