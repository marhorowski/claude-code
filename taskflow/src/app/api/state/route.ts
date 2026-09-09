import { NextResponse } from "next/server";
import { db, ensureTables, sessionUser } from "@/lib/db";
import type { Pool } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function wsSuffix(req: Request): string {
  const url = new URL(req.url);
  const ws = (url.searchParams.get("ws") ?? "default").trim();
  return ws.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "default";
}

/**
 * Zwraca identyfikator „właściciela" stanu. Logowanie jest opcjonalne:
 * - jeśli jest ważna sesja, używamy jej użytkownika,
 * - w przeciwnym razie (aplikacja jednoosobowa) używamy jedynego istniejącego
 *   konta, żeby dane z chmury się zachowały,
 * - a gdy kont nie ma — wspólnego klucza „shared".
 */
async function resolveUser(p: Pool, req: Request): Promise<string> {
  const sess = await sessionUser(p, req);
  if (sess) return sess;
  try {
    const { rows } = await p.query(
      "SELECT id FROM ergon_users ORDER BY created_at ASC LIMIT 1"
    );
    if (rows.length) return rows[0].id as string;
  } catch {
    // brak tabeli/kont — spadamy do wspólnego klucza
  }
  return "shared";
}

export async function GET(req: Request) {
  const p = db();
  if (!p) return NextResponse.json({ error: "no-database" }, { status: 501 });
  try {
    await ensureTables(p);
    const userId = await resolveUser(p, req);
    const id = `u:${userId}:${wsSuffix(req)}`;

    let { rows } = await p.query(
      "SELECT data, updated_at FROM ergon_state WHERE id = $1",
      [id]
    );
    if (!rows.length) {
      // migracja: stan sprzed logowania (zapisany pod samym kluczem ws)
      const legacy = await p.query(
        "SELECT data, updated_at FROM ergon_state WHERE id = $1",
        [wsSuffix(req)]
      );
      if (legacy.rows.length) {
        await p.query(
          `INSERT INTO ergon_state (id, data, updated_at) VALUES ($1, $2, $3)
           ON CONFLICT (id) DO NOTHING`,
          [id, legacy.rows[0].data, legacy.rows[0].updated_at]
        );
        rows = legacy.rows;
      }
    }
    if (!rows.length) {
      return NextResponse.json({ data: null, updatedAt: null });
    }
    return NextResponse.json({
      data: rows[0].data,
      updatedAt: rows[0].updated_at,
    });
  } catch {
    return NextResponse.json({ error: "db-error" }, { status: 502 });
  }
}

export async function PUT(req: Request) {
  const p = db();
  if (!p) return NextResponse.json({ error: "no-database" }, { status: 501 });
  try {
    await ensureTables(p);
    const userId = await resolveUser(p, req);
    const id = `u:${userId}:${wsSuffix(req)}`;

    const body = await req.json();
    if (typeof body !== "object" || body === null || !("data" in body)) {
      return NextResponse.json({ error: "bad-request" }, { status: 400 });
    }
    if (JSON.stringify(body.data).length > 2_000_000) {
      return NextResponse.json({ error: "too-large" }, { status: 413 });
    }

    // ochrona przed nadpisaniem nowszego stanu starszym (inne urządzenie
    // zapisało w międzyczasie): klient przysyła wersję, na której bazował
    const base = typeof body.baseUpdatedAt === "string" ? body.baseUpdatedAt : null;
    if (base !== null) {
      const cur = await p.query(
        "SELECT data, updated_at FROM ergon_state WHERE id = $1",
        [id]
      );
      if (cur.rows.length) {
        const curTs = new Date(cur.rows[0].updated_at).getTime();
        const baseTs = Date.parse(base);
        if (!baseTs || Math.abs(curTs - baseTs) > 1500) {
          return NextResponse.json(
            {
              error: "conflict",
              data: cur.rows[0].data,
              updatedAt: cur.rows[0].updated_at,
            },
            { status: 409 }
          );
        }
      }
    }

    const { rows } = await p.query(
      `INSERT INTO ergon_state (id, data, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = now()
       RETURNING updated_at`,
      [id, JSON.stringify(body.data)]
    );
    return NextResponse.json({ ok: true, updatedAt: rows[0].updated_at });
  } catch {
    return NextResponse.json({ error: "db-error" }, { status: 502 });
  }
}
