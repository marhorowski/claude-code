// Uruchamia podaną komendę z ustawionymi TRACKER_DATABASE_URL / TRACKER_DIRECT_URL.
import { spawnSync } from "node:child_process";
import { applyDatabaseEnv } from "./db-url.mjs";

if (!applyDatabaseEnv()) {
  console.error("Brak adresu bazy: ustaw TRACKER_DATABASE_URL (lokalnie) albo podłącz bazę Neon w Vercelu.");
  process.exit(1);
}
const [cmd, ...args] = process.argv.slice(2);
const result = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
process.exit(result.status ?? 1);
