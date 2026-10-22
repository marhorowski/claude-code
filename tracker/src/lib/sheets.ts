// Wysyłanie wpisów do arkusza Google klienta (przez skrypt Apps Script z apps-script.ts).
// Błąd arkusza nigdy nie blokuje zapisu w aplikacji — zapisujemy go przy kliencie i pokazujemy adminowi.
import type { Entry } from "@prisma/client";
import { prisma } from "./db";
import { mondayOf, toIso } from "./periods";
import { sheetSchema } from "./sheet-spec";

const TIMEOUT_MS = 20_000;

export function isValidSheetUrl(url: string): boolean {
  if (process.env.TRACKER_ALLOW_TEST_SHEET_URL === "1" && url.startsWith("http://localhost")) return true;
  return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url);
}

export function entryPayload(e: Entry) {
  const dateTo = toIso(e.dateTo);
  return {
    id: e.id,
    area: e.area,
    dateFrom: toIso(e.dateFrom),
    dateTo,
    week: mondayOf(dateTo),
    month: dateTo.slice(0, 7),
    values: e.values as Record<string, number>,
    notes: e.notes ?? "",
    updatedAt: e.updatedAt.toISOString(),
  };
}

type SheetReply = { ok: boolean; error?: string; name?: string };

async function call(url: string, body: object): Promise<SheetReply> {
  try {
    // Apps Script odpowiada przekierowaniem na googleusercontent.com — fetch idzie za nim i czyta JSON.
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const text = await res.text();
    try {
      return JSON.parse(text) as SheetReply;
    } catch {
      return { ok: false, error: res.ok ? "Arkusz odpowiedział nie tym, czego się spodziewano — sprawdź, czy wdrożenie ma dostęp „Każdy”." : `Arkusz odpowiedział błędem ${res.status}.` };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.name === "TimeoutError" ? "Arkusz nie odpowiedział w 20 s." : "Nie udało się połączyć z arkuszem." };
  }
}

async function record(clientId: string, reply: SheetReply) {
  await prisma.client.update({
    where: { id: clientId },
    data: reply.ok
      ? { sheetSyncedAt: new Date(), sheetError: null, ...(reply.name ? { sheetName: reply.name } : {}) }
      : { sheetError: reply.error ?? "Nieznany błąd arkusza." },
  });
}

/** Pełna synchronizacja: wszystkie wpisy klienta + odbudowa zakładek z formułami. */
export async function syncAll(clientId: string, url?: string): Promise<SheetReply> {
  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  const target = url ?? client.sheetUrl;
  if (!target || !client.sheetSecret) return { ok: false, error: "Arkusz nie jest podłączony." };
  const entries = await prisma.entry.findMany({ where: { clientId }, orderBy: [{ area: "asc" }, { dateTo: "asc" }] });
  const reply = await call(target, { secret: client.sheetSecret, action: "setup", schema: sheetSchema(), entries: entries.map(entryPayload) });
  if (client.sheetUrl === target) await record(clientId, reply);
  return reply;
}

export async function syncEntry(entryId: string) {
  const entry = await prisma.entry.findUnique({ where: { id: entryId }, include: { client: true } });
  if (!entry?.client.sheetUrl || !entry.client.sheetSecret) return;
  // Po wcześniejszym błędzie arkusz mógł przegapić wpisy — wtedy wysyłamy wszystko od nowa.
  if (entry.client.sheetError) {
    await syncAll(entry.clientId);
    return;
  }
  const reply = await call(entry.client.sheetUrl, { secret: entry.client.sheetSecret, action: "upsert", schema: sheetSchema(), entry: entryPayload(entry) });
  await record(entry.clientId, reply);
}

export async function syncDelete(clientId: string, area: string, id: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client?.sheetUrl || !client.sheetSecret) return;
  if (client.sheetError) {
    await syncAll(clientId);
    return;
  }
  await record(clientId, await call(client.sheetUrl, { secret: client.sheetSecret, action: "delete", area, id }));
}
