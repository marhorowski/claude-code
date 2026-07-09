import { Pool } from "pg";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

let pool: Pool | null = null;
let tablesReady = false;
let cachedSecret: string | null = null;

export function db(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      max: 1,
      ssl: /localhost|127\.0\.0\.1/.test(url)
        ? undefined
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function ensureTables(p: Pool) {
  if (tablesReady) return;
  await p.query(`
    CREATE TABLE IF NOT EXISTS ergon_state (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS ergon_users (
      id TEXT PRIMARY KEY,
      login TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS ergon_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  tablesReady = true;
}

/** Sekret do podpisywania sesji — trzymany w bazie, tworzony przy pierwszym użyciu. */
async function secret(p: Pool): Promise<string> {
  if (cachedSecret) return cachedSecret;
  const envSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (envSecret) {
    cachedSecret = envSecret;
    return envSecret;
  }
  await ensureTables(p);
  const { rows } = await p.query(
    "SELECT value FROM ergon_config WHERE key = 'session_secret'"
  );
  if (rows.length) {
    cachedSecret = rows[0].value as string;
    return cachedSecret;
  }
  const fresh = randomBytes(32).toString("hex");
  await p.query(
    `INSERT INTO ergon_config (key, value) VALUES ('session_secret', $1)
     ON CONFLICT (key) DO NOTHING`,
    [fresh]
  );
  const again = await p.query(
    "SELECT value FROM ergon_config WHERE key = 'session_secret'"
  );
  cachedSecret = again.rows[0].value as string;
  return cachedSecret;
}

const SESSION_DAYS = 30;
export const SESSION_COOKIE = "ergon_session";

export async function makeSessionToken(
  p: Pool,
  userId: string
): Promise<string> {
  const exp = Date.now() + SESSION_DAYS * 24 * 3600 * 1000;
  const payload = `${userId}.${exp}`;
  const sig = createHmac("sha256", await secret(p))
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

export async function verifySessionToken(
  p: Pool,
  token: string | undefined
): Promise<string | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!exp || exp < Date.now()) return null;
  const expected = createHmac("sha256", await secret(p))
    .update(`${userId}.${expStr}`)
    .digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export function sessionCookie(token: string): string {
  const maxAge = SESSION_DAYS * 24 * 3600;
  return `${SESSION_COOKIE}=${encodeURIComponent(
    token
  )}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

/** Zwraca id zalogowanego użytkownika albo null. */
export async function sessionUser(
  p: Pool,
  req: Request
): Promise<string | null> {
  return verifySessionToken(p, readCookie(req, SESSION_COOKIE));
}
