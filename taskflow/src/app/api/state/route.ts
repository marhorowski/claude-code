import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let pool: Pool | null = null;
let tableReady = false;

function db(): Pool | null {
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

async function ensureTable(p: Pool) {
  if (tableReady) return;
  await p.query(`
    CREATE TABLE IF NOT EXISTS ergon_state (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  tableReady = true;
}

function wsId(req: Request): string {
  const url = new URL(req.url);
  const ws = (url.searchParams.get("ws") ?? "default").trim();
  // ograniczamy do bezpiecznego identyfikatora
  return ws.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "default";
}

export async function GET(req: Request) {
  const p = db();
  if (!p) return NextResponse.json({ error: "no-database" }, { status: 501 });
  try {
    await ensureTable(p);
    const { rows } = await p.query(
      "SELECT data, updated_at FROM ergon_state WHERE id = $1",
      [wsId(req)]
    );
    if (!rows.length) {
      return NextResponse.json({ data: null, updatedAt: null });
    }
    return NextResponse.json({
      data: rows[0].data,
      updatedAt: rows[0].updated_at,
    });
  } catch (e) {
    return NextResponse.json({ error: "db-error" }, { status: 502 });
  }
}

export async function PUT(req: Request) {
  const p = db();
  if (!p) return NextResponse.json({ error: "no-database" }, { status: 501 });
  try {
    const body = await req.json();
    if (typeof body !== "object" || body === null || !("data" in body)) {
      return NextResponse.json({ error: "bad-request" }, { status: 400 });
    }
    // limit rozmiaru: 2 MB stanu w zupełności wystarcza
    if (JSON.stringify(body.data).length > 2_000_000) {
      return NextResponse.json({ error: "too-large" }, { status: 413 });
    }
    await ensureTable(p);
    const { rows } = await p.query(
      `INSERT INTO ergon_state (id, data, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = now()
       RETURNING updated_at`,
      [wsId(req), JSON.stringify(body.data)]
    );
    return NextResponse.json({ ok: true, updatedAt: rows[0].updated_at });
  } catch (e) {
    return NextResponse.json({ error: "db-error" }, { status: 502 });
  }
}
