jest.mock("child_process", () => ({
  execFile: jest.fn(),
}));

jest.mock("util", () => ({
  promisify: (fn: (...args: unknown[]) => unknown) => fn,
}));

import { execFile as execFileMock } from "child_process";

const execFile = execFileMock as unknown as jest.Mock;

import { querySqlite } from "../../lib/safe-query";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Security: base64 encoding of parameters", () => {
  it("all parameters are base64-encoded in argv, not interpolated into script", async () => {
    execFile.mockResolvedValue({ stdout: "[]", stderr: "" });

    const sql = "SELECT * FROM dogs WHERE name = ? AND breed = ?";
    const params = ["O'Brien", "American Pit Bull"];

    await querySqlite(sql, params);

    const args = execFile.mock.calls[0][1];
    const script = args[1];

    // Verify the script itself uses base64 decoding from sys.argv
    expect(script).toContain("base64.b64decode(sys.argv[1])");
    expect(script).toContain("base64.b64decode(sys.argv[2])");
    expect(script).toContain("base64.b64decode(sys.argv[3])");

    // Verify none of the user-supplied values appear in the script text
    expect(script).not.toContain("O'Brien");
    expect(script).not.toContain("American Pit Bull");
    expect(script).not.toContain(sql);

    // args layout: ["-c", script, db_b64, sql_b64, params_b64, single_flag]
    // Verify they are properly base64-encoded in args
    const decodedSql = Buffer.from(args[3], "base64").toString();
    expect(decodedSql).toBe(sql);

    const decodedParams = JSON.parse(Buffer.from(args[4], "base64").toString());
    expect(decodedParams).toEqual(params);
  });

  it("base64-encoded args are valid base64 strings", async () => {
    execFile.mockResolvedValue({ stdout: "[]", stderr: "" });

    await querySqlite("SELECT 1", ["test"]);

    const args = execFile.mock.calls[0][1];
    // args[2]=db, args[3]=sql, args[4]=params should be valid base64
    for (const idx of [2, 3, 4]) {
      expect(args[idx]).toMatch(/^[A-Za-z0-9+/]+=*$/);
    }
  });
});

describe("Security: SQL injection prevention", () => {
  it("SQL injection payload is passed as a bind parameter, not interpolated", async () => {
    execFile.mockResolvedValue({ stdout: "[]", stderr: "" });

    const injectionPayload = "'; DROP TABLE dogs; --";
    await querySqlite("SELECT * FROM dogs WHERE name = ?", [injectionPayload]);

    const args = execFile.mock.calls[0][1];
    const script = args[1];

    // The injection payload must not appear in the script
    expect(script).not.toContain("DROP TABLE");
    expect(script).not.toContain(injectionPayload);

    // The script uses parameterized query via cur.execute(sql, params)
    expect(script).toContain("cur.execute(sql, params)");

    // The payload is safely encoded in base64
    const decodedParams = JSON.parse(Buffer.from(args[4], "base64").toString());
    expect(decodedParams).toEqual([injectionPayload]);
  });

  it("SQL with UNION-based injection is safely parameterized", async () => {
    execFile.mockResolvedValue({ stdout: "[]", stderr: "" });

    const unionInjection = "' UNION SELECT password FROM users --";
    await querySqlite("SELECT * FROM dogs WHERE name = ?", [unionInjection]);

    const args = execFile.mock.calls[0][1];
    expect(args[1]).not.toContain("UNION SELECT");

    const decodedParams = JSON.parse(Buffer.from(args[4], "base64").toString());
    expect(decodedParams).toEqual([unionInjection]);
  });

  it("multiple dangerous params are all safely encoded", async () => {
    execFile.mockResolvedValue({ stdout: "[]", stderr: "" });

    const params = [
      "'; DROP TABLE dogs; --",
      "1 OR 1=1",
      "admin'--",
      null,
      42,
    ];

    await querySqlite("SELECT * FROM dogs WHERE a=? AND b=? AND c=? AND d=? AND e=?", params);

    const args = execFile.mock.calls[0][1];
    const script = args[1];

    expect(script).not.toContain("DROP TABLE");
    expect(script).not.toContain("OR 1=1");

    const decodedParams = JSON.parse(Buffer.from(args[4], "base64").toString());
    expect(decodedParams).toEqual(params);
  });
});

describe("Security: command injection prevention", () => {
  it("command injection in parameters cannot execute via base64 encoding", async () => {
    execFile.mockResolvedValue({ stdout: "[]", stderr: "" });

    const cmdInjection = '"; import os; os.system("id"); x="';
    await querySqlite("SELECT * FROM dogs WHERE sex = ?", [cmdInjection]);

    const args = execFile.mock.calls[0][1];
    const script = args[1];

    // The command injection string must not appear in the script
    expect(script).not.toContain("os.system");
    expect(script).not.toContain('import os');
    // (the script has 'import sqlite3, json, sys, base64' but not 'import os')

    // It should be safely encoded in the base64 params
    const decodedParams = JSON.parse(Buffer.from(args[4], "base64").toString());
    expect(decodedParams).toEqual([cmdInjection]);
  });

  it("shell metacharacters in parameters are safely encoded", async () => {
    execFile.mockResolvedValue({ stdout: "[]", stderr: "" });

    const shellPayload = "$(rm -rf /) && `whoami` | cat /etc/passwd";
    await querySqlite("SELECT * FROM dogs WHERE name = ?", [shellPayload]);

    const args = execFile.mock.calls[0][1];
    const script = args[1];

    expect(script).not.toContain("rm -rf");
    expect(script).not.toContain("whoami");
    expect(script).not.toContain("/etc/passwd");

    const decodedParams = JSON.parse(Buffer.from(args[4], "base64").toString());
    expect(decodedParams).toEqual([shellPayload]);
  });

  it("uses execFile not exec - preventing shell interpretation of args", async () => {
    execFile.mockResolvedValue({ stdout: "[]", stderr: "" });

    await querySqlite("SELECT 1", ["safe"]);

    // execFile is called (not exec), which does not spawn a shell
    expect(execFile).toHaveBeenCalledWith(
      "python3",
      expect.any(Array),
      expect.any(Object)
    );
  });
});
