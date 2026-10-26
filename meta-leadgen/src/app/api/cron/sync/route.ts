import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncClient } from "@/lib/sync";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const TIME_BUDGET_MS = 240_000;

// Vercel Cron wywołuje to raz dziennie z nagłówkiem Authorization: Bearer $CRON_SECRET.
// Klienci synchronizowani od najdawniej odświeżonego; co nie zmieści się w czasie, pójdzie przy kolejnym uruchomieniu.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }
  const started = Date.now();
  const clients = await prisma.client.findMany({
    where: { active: true, NOT: { adAccountId: { startsWith: "demo" } } },
    orderBy: { lastSyncAt: { sort: "asc", nulls: "first" } },
  });
  const results: { client: string; ok: boolean; message?: string }[] = [];
  for (const c of clients) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    try {
      const r = await syncClient(c.id);
      results.push({ client: c.name, ok: true, message: `${r.rows} wierszy` });
    } catch (e) {
      results.push({ client: c.name, ok: false, message: (e as Error).message });
    }
  }
  return NextResponse.json({ synced: results.length, total: clients.length, results });
}
