import { querySqlite } from "./safe-query";

export interface SessionUser {
  id: number;
  username: string;
  email: string;
  role: string;
}

export async function validateSession(request: Request): Promise<SessionUser | null> {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;

  const session = await querySqlite(
    "SELECT u.id, u.username, u.email, u.role FROM user_sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now')",
    [token],
    { single: true }
  );

  if (!session) return null;
  return {
    id: Number(session.id),
    username: String(session.username),
    email: String(session.email),
    role: String(session.role),
  };
}

export async function requireAuth(request: Request): Promise<SessionUser> {
  const user = await validateSession(request);
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireAdmin(request: Request): Promise<SessionUser> {
  const user = await requireAuth(request);
  if (user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return user;
}
