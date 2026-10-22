"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentClient } from "@/lib/clients";
import { findConflict, parseEntry, type EntryInput } from "@/lib/entries";
import { getArea } from "@/lib/fields";
import { formatDay, toDate, toIso } from "@/lib/periods";

export type ActionResult = { ok: true; message: string } | { ok: false; errors: string[] };

function describeRange(from: string, to: string) {
  return from === to ? formatDay(from) : `${formatDay(from)} – ${formatDay(to)}`;
}

async function saveEntry(clientId: string, input: EntryInput, editingId?: string): Promise<ActionResult> {
  const sameArea = await prisma.entry.findMany({
    where: { clientId, area: input.area },
    select: { id: true, dateFrom: true, dateTo: true },
  });
  const ranges = sameArea.map((e) => ({ id: e.id, dateFrom: toIso(e.dateFrom), dateTo: toIso(e.dateTo) }));
  const conflict = findConflict(ranges, input, editingId);
  if (conflict) {
    return {
      ok: false,
      errors: [`Ten zakres nachodzi na istniejący wpis (${describeRange(conflict.dateFrom, conflict.dateTo)}). Popraw daty albo najpierw zmień tamten wpis.`],
    };
  }

  const data = { values: input.values, notes: input.notes, dateFrom: toDate(input.dateFrom), dateTo: toDate(input.dateTo) };
  const sameRange = ranges.find((r) => r.dateFrom === input.dateFrom && r.dateTo === input.dateTo);
  const label = `${getArea(input.area)?.label}, ${describeRange(input.dateFrom, input.dateTo)}`;

  if (editingId) {
    if (sameRange && sameRange.id !== editingId) {
      return { ok: false, errors: ["Wpis z dokładnie tym zakresem dat już istnieje. Edytuj tamten albo go usuń."] };
    }
    await prisma.entry.update({ where: { id: editingId, clientId }, data });
    revalidatePath("/panel", "layout");
    return { ok: true, message: `Zapisano zmiany: ${label}.` };
  }

  if (sameRange) {
    await prisma.entry.update({ where: { id: sameRange.id }, data });
    revalidatePath("/panel", "layout");
    return { ok: true, message: `Zastąpiono wcześniejszy wpis: ${label}.` };
  }

  await prisma.entry.create({ data: { ...data, clientId, area: input.area } });
  revalidatePath("/panel", "layout");
  return { ok: true, message: `Zapisano: ${label}.` };
}

export async function submitPublicEntry(token: string, form: Record<string, string>): Promise<ActionResult> {
  const client = await prisma.client.findUnique({ where: { formToken: token } });
  if (!client) return { ok: false, errors: ["Ten link do formularza jest nieaktywny."] };
  const parsed = parseEntry(form);
  if (!parsed.ok) return parsed;
  return saveEntry(client.id, parsed.entry);
}

// Klient zawsze wynika z sesji, nigdy z danych przesłanych przez przeglądarkę.
export async function savePanelEntry(form: Record<string, string>, editingId?: string): Promise<ActionResult> {
  const client = await getCurrentClient();
  const parsed = parseEntry(form);
  if (!parsed.ok) return parsed;
  return saveEntry(client.id, parsed.entry, editingId);
}

export async function deleteEntry(id: string): Promise<void> {
  const client = await getCurrentClient();
  await prisma.entry.delete({ where: { id, clientId: client.id } });
  revalidatePath("/panel", "layout");
}
