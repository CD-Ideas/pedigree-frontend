import { execSync } from "child_process";
import { accessSync } from "fs";
import path from "path";

export default function globalSetup() {
  // Find repo root by looking for docker-compose.yml
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    try {
      accessSync(path.join(dir, "docker-compose.yml"));
      break;
    } catch {
      dir = path.dirname(dir);
    }
  }

  const seedScript = path.join(dir, "tests/seed-e2e-data.py");

  try {
    execSync(
      `docker compose exec -T frontend python3 /dev/stdin < "${seedScript}"`,
      { cwd: dir, stdio: "inherit", timeout: 30000 }
    );
  } catch {
    try {
      execSync(
        `python3 "${seedScript}"`,
        { cwd: dir, stdio: "inherit", timeout: 15000, env: { ...process.env } }
      );
    } catch (e) {
      console.warn("Could not seed test data:", e instanceof Error ? e.message : e);
    }
  }
}
