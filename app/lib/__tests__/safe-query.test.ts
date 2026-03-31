import { querySqlite, executeSqlite, executeSqliteReturning, runPythonScript } from "../safe-query";

jest.mock("child_process", () => ({
  execFile: jest.fn(),
}));

jest.mock("util", () => ({
  promisify: (fn: (...args: unknown[]) => unknown) => fn,
}));

import { execFile as execFileMock } from "child_process";

const execFile = execFileMock as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("querySqlite", () => {
  it("passes DB path, SQL, and params as base64-encoded argv", async () => {
    const mockResult = { stdout: '[{"id":1}]', stderr: "" };
    execFile.mockResolvedValue(mockResult);

    await querySqlite("SELECT * FROM dogs WHERE id = ?", [42]);

    expect(execFile).toHaveBeenCalledTimes(1);
    const callArgs = execFile.mock.calls[0];
    expect(callArgs[0]).toBe("python3");

    const args = callArgs[1];
    // args[0] = "-c", args[1] = script, args[2] = db_path b64, args[3] = sql b64, args[4] = params b64, args[5] = single flag
    expect(args[0]).toBe("-c");

    // Verify base64 encoding of db path
    const decodedDbPath = Buffer.from(args[2], "base64").toString();
    expect(decodedDbPath).toContain("apbt_v2.db");

    // Verify base64 encoding of SQL
    const decodedSql = Buffer.from(args[3], "base64").toString();
    expect(decodedSql).toBe("SELECT * FROM dogs WHERE id = ?");

    // Verify base64 encoding of params
    const decodedParams = JSON.parse(Buffer.from(args[4], "base64").toString());
    expect(decodedParams).toEqual([42]);

    // Verify single flag
    expect(args[5]).toBe("0");
  });

  it("params are never interpolated into the script string", async () => {
    const maliciousParam = "'; DROP TABLE dogs; --";
    execFile.mockResolvedValue({ stdout: "[]", stderr: "" });

    await querySqlite("SELECT * FROM dogs WHERE name = ?", [maliciousParam]);

    const callArgs = execFile.mock.calls[0];
    const script = callArgs[1][1]; // The Python script string

    // The malicious string must NOT appear anywhere in the script
    expect(script).not.toContain(maliciousParam);

    // It should only appear in the base64-encoded params arg
    const decodedParams = JSON.parse(Buffer.from(callArgs[1][4], "base64").toString());
    expect(decodedParams).toEqual([maliciousParam]);
  });

  it("passes timeout option to execFile", async () => {
    execFile.mockResolvedValue({ stdout: "[]", stderr: "" });

    await querySqlite("SELECT 1", [], { timeout: 5000 });

    const options = execFile.mock.calls[0][2];
    expect(options.timeout).toBe(5000);
  });

  it("uses default timeout of 15000ms", async () => {
    execFile.mockResolvedValue({ stdout: "[]", stderr: "" });

    await querySqlite("SELECT 1");

    const options = execFile.mock.calls[0][2];
    expect(options.timeout).toBe(15000);
  });

  it("propagates execFile errors", async () => {
    execFile.mockRejectedValue(new Error("Command failed"));

    await expect(querySqlite("SELECT 1")).rejects.toThrow("Command failed");
  });

  it("logs stderr but still returns result", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    execFile.mockResolvedValue({
      stdout: '[{"id":1}]',
      stderr: "some warning",
    });

    const result = await querySqlite("SELECT 1");

    expect(result).toEqual([{ id: 1 }]);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[sqlite-query] stderr:",
      "some warning"
    );
    consoleSpy.mockRestore();
  });

  it("throws on invalid JSON output", async () => {
    execFile.mockResolvedValue({ stdout: "not json", stderr: "" });

    await expect(querySqlite("SELECT 1")).rejects.toThrow();
  });

  it("single option sets flag to '1'", async () => {
    execFile.mockResolvedValue({ stdout: '{"id":1}', stderr: "" });

    await querySqlite("SELECT * FROM dogs LIMIT 1", [], { single: true });

    const args = execFile.mock.calls[0][1];
    expect(args[5]).toBe("1");
  });

  it("returns single object when single=true and result exists", async () => {
    execFile.mockResolvedValue({ stdout: '{"id":1,"name":"Rex"}', stderr: "" });

    const result = await querySqlite("SELECT * FROM dogs LIMIT 1", [], {
      single: true,
    });

    expect(result).toEqual({ id: 1, name: "Rex" });
  });

  it("returns null when single=true and no results", async () => {
    execFile.mockResolvedValue({ stdout: "null", stderr: "" });

    const result = await querySqlite("SELECT * FROM dogs WHERE id = ?", [999], {
      single: true,
    });

    expect(result).toBeNull();
  });

  it("returns array when single=false", async () => {
    execFile.mockResolvedValue({
      stdout: '[{"id":1},{"id":2}]',
      stderr: "",
    });

    const result = await querySqlite("SELECT * FROM dogs LIMIT 2");

    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });
});

describe("executeSqlite", () => {
  it("passes base64-encoded args without single flag", async () => {
    execFile.mockResolvedValue({ stdout: '{"rowsAffected":1}', stderr: "" });

    await executeSqlite("UPDATE dogs SET name = ? WHERE id = ?", ["Rex", 1]);

    const args = execFile.mock.calls[0][1];
    // executeSqlite does not pass a single flag (only 5 args: -c, script, db, sql, params)
    expect(args).toHaveLength(5);

    const decodedParams = JSON.parse(Buffer.from(args[4], "base64").toString());
    expect(decodedParams).toEqual(["Rex", 1]);
  });

  it("returns rowsAffected", async () => {
    execFile.mockResolvedValue({ stdout: '{"rowsAffected":3}', stderr: "" });

    const result = await executeSqlite("DELETE FROM dogs WHERE breed = ?", ["unknown"]);

    expect(result).toEqual({ rowsAffected: 3 });
  });
});

describe("executeSqliteReturning", () => {
  it("returns lastRowId and rowsAffected", async () => {
    execFile.mockResolvedValue({
      stdout: '{"lastRowId":42,"rowsAffected":1}',
      stderr: "",
    });

    const result = await executeSqliteReturning(
      "INSERT INTO dogs (name) VALUES (?)",
      ["Rex"]
    );

    expect(result).toEqual({ lastRowId: 42, rowsAffected: 1 });
  });
});

describe("runPythonScript", () => {
  it("passes script and args directly to python3", async () => {
    execFile.mockResolvedValue({ stdout: '{"ok":true}', stderr: "" });

    const script = "import sys; print(sys.argv[1])";
    await runPythonScript(script, ["arg1", "arg2"]);

    const callArgs = execFile.mock.calls[0];
    expect(callArgs[0]).toBe("python3");
    expect(callArgs[1]).toEqual(["-c", script, "arg1", "arg2"]);
  });

  it("respects maxBuffer option", async () => {
    execFile.mockResolvedValue({ stdout: '{"ok":true}', stderr: "" });

    await runPythonScript("print(1)", [], { maxBuffer: 1024 });

    const options = execFile.mock.calls[0][2];
    expect(options.maxBuffer).toBe(1024);
  });

  it("defaults maxBuffer to 10MB", async () => {
    execFile.mockResolvedValue({ stdout: '{"ok":true}', stderr: "" });

    await runPythonScript("print(1)");

    const options = execFile.mock.calls[0][2];
    expect(options.maxBuffer).toBe(10 * 1024 * 1024);
  });
});
