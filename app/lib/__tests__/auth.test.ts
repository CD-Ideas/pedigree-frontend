jest.mock("../safe-query", () => ({
  querySqlite: jest.fn(),
}));

import { validateSession, requireAuth, requireAdmin } from "../auth";
import { querySqlite } from "../safe-query";

const mockedQuerySqlite = querySqlite as jest.MockedFunction<typeof querySqlite>;

function makeRequest(token?: string): Request {
  const headers: Record<string, string> = {};
  if (token) {
    headers["authorization"] = `Bearer ${token}`;
  }
  return new Request("http://localhost/api/test", { headers });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("validateSession", () => {
  it("returns user for valid token", async () => {
    const mockUser = { id: 1, username: "john", email: "john@example.com", role: "user" };
    mockedQuerySqlite.mockResolvedValue(mockUser);

    const result = await validateSession(makeRequest("valid-token-123"));

    expect(result).toEqual(mockUser);
    expect(mockedQuerySqlite).toHaveBeenCalledWith(
      expect.stringContaining("SELECT u.id, u.username, u.email, u.role"),
      ["valid-token-123"],
      { single: true }
    );
  });

  it("returns null when no authorization header", async () => {
    const result = await validateSession(makeRequest());

    expect(result).toBeNull();
    expect(mockedQuerySqlite).not.toHaveBeenCalled();
  });

  it("returns null when token is empty string after Bearer prefix", async () => {
    const result = await validateSession(makeRequest(""));

    expect(result).toBeNull();
  });

  it("returns null when session is expired (query returns null)", async () => {
    mockedQuerySqlite.mockResolvedValue(null);

    const result = await validateSession(makeRequest("expired-token"));

    expect(result).toBeNull();
  });

  it("returns null when session not found (query returns undefined)", async () => {
    mockedQuerySqlite.mockResolvedValue(undefined);

    const result = await validateSession(makeRequest("nonexistent-token"));

    expect(result).toBeNull();
  });

  it("passes token without 'Bearer ' prefix to the query", async () => {
    mockedQuerySqlite.mockResolvedValue(null);

    await validateSession(makeRequest("my-secret-token"));

    expect(mockedQuerySqlite).toHaveBeenCalledWith(
      expect.any(String),
      ["my-secret-token"],
      expect.any(Object)
    );
  });
});

describe("requireAuth", () => {
  it("returns user when valid token provided", async () => {
    const mockUser = { id: 1, username: "john", email: "john@example.com", role: "user" };
    mockedQuerySqlite.mockResolvedValue(mockUser);

    const result = await requireAuth(makeRequest("valid-token"));

    expect(result).toEqual(mockUser);
  });

  it("throws UNAUTHORIZED when no token provided", async () => {
    await expect(requireAuth(makeRequest())).rejects.toThrow("UNAUTHORIZED");
  });

  it("throws UNAUTHORIZED when session expired", async () => {
    mockedQuerySqlite.mockResolvedValue(null);

    await expect(requireAuth(makeRequest("expired-token"))).rejects.toThrow("UNAUTHORIZED");
  });
});

describe("requireAdmin", () => {
  it("returns user when admin role", async () => {
    const adminUser = { id: 1, username: "admin", email: "admin@example.com", role: "admin" };
    mockedQuerySqlite.mockResolvedValue(adminUser);

    const result = await requireAdmin(makeRequest("admin-token"));

    expect(result).toEqual(adminUser);
  });

  it("throws FORBIDDEN when user is not admin", async () => {
    const normalUser = { id: 2, username: "john", email: "john@example.com", role: "user" };
    mockedQuerySqlite.mockResolvedValue(normalUser);

    await expect(requireAdmin(makeRequest("user-token"))).rejects.toThrow("FORBIDDEN");
  });

  it("throws UNAUTHORIZED when no token (before checking role)", async () => {
    await expect(requireAdmin(makeRequest())).rejects.toThrow("UNAUTHORIZED");
  });

  it("throws FORBIDDEN for moderator role (not admin)", async () => {
    const modUser = { id: 3, username: "mod", email: "mod@example.com", role: "moderator" };
    mockedQuerySqlite.mockResolvedValue(modUser);

    await expect(requireAdmin(makeRequest("mod-token"))).rejects.toThrow("FORBIDDEN");
  });
});
