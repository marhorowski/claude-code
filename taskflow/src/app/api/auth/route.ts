import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  db,
  ensureTables,
  makeSessionToken,
  sessionCookie,
  clearSessionCookie,
  sessionUser,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  /api/auth            -> { mode: "no-db" | "setup" | "login" | "authed", login? }
 * POST /api/auth {action: "register"|"login"|"logout", login, password}
 */

export async function GET(req: Request) {
  const p = db();
  if (!p) return NextResponse.json({ mode: "no-db" });
  try {
    await ensureTables(p);
    const userId = await sessionUser(p, req);
    if (userId) {
      const { rows } = await p.query(
        "SELECT login FROM ergon_users WHERE id = $1",
        [userId]
      );
      if (rows.length) {
        return NextResponse.json({ mode: "authed", login: rows[0].login });
      }
    }
    const { rows } = await p.query("SELECT COUNT(*)::int AS n FROM ergon_users");
    return NextResponse.json({ mode: rows[0].n === 0 ? "setup" : "login" });
  } catch {
    return NextResponse.json({ mode: "no-db" });
  }
}

export async function POST(req: Request) {
  const p = db();
  if (!p) return NextResponse.json({ error: "no-database" }, { status: 501 });

  let body: { action?: string; login?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  try {
    await ensureTables(p);

    if (body.action === "logout") {
      const res = NextResponse.json({ ok: true });
      res.headers.set("Set-Cookie", clearSessionCookie());
      return res;
    }

    const login = (body.login ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    if (login.length < 3 || password.length < 8) {
      return NextResponse.json(
        { error: "Login min. 3 znaki, hasło min. 8 znaków." },
        { status: 400 }
      );
    }

    if (body.action === "register") {
      const { rows } = await p.query(
        "SELECT COUNT(*)::int AS n FROM ergon_users"
      );
      if (rows[0].n > 0) {
        return NextResponse.json(
          { error: "Konto już istnieje — zaloguj się." },
          { status: 403 }
        );
      }
      const hash = await bcrypt.hash(password, 12);
      const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      await p.query(
        "INSERT INTO ergon_users (id, login, password_hash) VALUES ($1, $2, $3)",
        [id, login, hash]
      );
      const res = NextResponse.json({ ok: true, login });
      res.headers.set("Set-Cookie", sessionCookie(await makeSessionToken(p, id)));
      return res;
    }

    if (body.action === "login") {
      const { rows } = await p.query(
        "SELECT id, password_hash FROM ergon_users WHERE login = $1",
        [login]
      );
      // stała praca nawet przy braku użytkownika (timing)
      const hash = rows.length
        ? rows[0].password_hash
        : "$2a$12$C6UzMDM.H6dfI/f/IKcEeO7ZDbQ0P1cOb0jU5C3p2n0V1YyDq0y1u";
      const ok = await bcrypt.compare(password, hash);
      if (!rows.length || !ok) {
        return NextResponse.json(
          { error: "Nieprawidłowy login lub hasło." },
          { status: 401 }
        );
      }
      const res = NextResponse.json({ ok: true, login });
      res.headers.set(
        "Set-Cookie",
        sessionCookie(await makeSessionToken(p, rows[0].id))
      );
      return res;
    }

    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "db-error" }, { status: 502 });
  }
}
