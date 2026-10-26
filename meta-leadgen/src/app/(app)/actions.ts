"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAdAccount, normalizeAccountId } from "@/lib/meta/graph";
import { recomputeConversions } from "@/lib/sync";
import { buildReport } from "@/lib/report";
import { createDemoClient } from "@/lib/demo";

export type ActionState = { error?: string; ok?: string } | null;

export async function addClient(_: ActionState, form: FormData): Promise<ActionState> {
  const accountId = normalizeAccountId(String(form.get("accountId") ?? ""));
  if (!accountId) return { error: "Podaj ID konta reklamowego (same cyfry, np. 1234567890)." };

  const existing = await prisma.client.findUnique({ where: { adAccountId: accountId } });
  if (existing) redirect(`/clients/${existing.id}`);

  let info;
  try {
    info = await getAdAccount(accountId);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const target = Number(form.get("targetCostPerBooking"));
  const client = await prisma.client.create({
    data: {
      name: String(form.get("name") || info.name),
      adAccountId: accountId,
      currency: info.currency,
      timezone: info.timezone_name,
      ...(target > 0 ? { targetCostPerBooking: target } : {}),
    },
  });
  // Pierwsza synchronizacja (90 dni) startuje automatycznie na stronie klienta
  redirect(`/clients/${client.id}?firstSync=1`);
}

const optNum = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(",", ".").trim();
  if (!s) return null;
  const n = Number(s);
  return isFinite(n) && n >= 0 ? n : null;
};

export async function updateClient(clientId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const before = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  const target = optNum(form.get("targetCostPerBooking"));
  if (!target) return { error: "Docelowy koszt spotkania musi być większy od zera." };
  const leadActionType = String(form.get("leadActionType") ?? "").trim() || null;
  const bookingActionType = String(form.get("bookingActionType") ?? "").trim() || null;

  await prisma.client.update({
    where: { id: clientId },
    data: {
      name: String(form.get("name") || before.name),
      active: form.get("active") === "on",
      targetCostPerBooking: target,
      targetCpl: optNum(form.get("targetCpl")),
      minBookingsForWin: Math.max(1, Math.round(optNum(form.get("minBookingsForWin")) ?? 3)),
      killSpendMultiplier: Math.max(1, optNum(form.get("killSpendMultiplier")) ?? 2),
      maxFrequency: Math.max(1, optNum(form.get("maxFrequency")) ?? 3),
      leadActionType,
      bookingActionType,
    },
  });

  let note = "";
  if (leadActionType !== before.leadActionType || bookingActionType !== before.bookingActionType) {
    const r = await recomputeConversions(clientId);
    note = ` Przeliczono dane (${r.updated} wierszy).`;
  }
  revalidatePath(`/clients/${clientId}`, "layout");
  return { ok: "Zapisano." + note };
}

export async function deleteClient(clientId: string) {
  await prisma.client.delete({ where: { id: clientId } });
  revalidatePath("/");
  redirect("/");
}

export async function generateReport(clientId: string, form: FormData) {
  const days = Number(form.get("days")) || 7;
  const data = await buildReport(clientId, days);
  const report = await prisma.report.create({
    data: {
      clientId,
      periodStart: new Date(data.period.start + "T00:00:00Z"),
      periodEnd: new Date(data.period.end + "T00:00:00Z"),
      data: data as object,
      shareToken: randomBytes(18).toString("base64url"),
    },
  });
  redirect(`/clients/${clientId}/reports/${report.id}`);
}

export async function deleteReport(clientId: string, reportId: string) {
  await prisma.report.delete({ where: { id: reportId } });
  redirect(`/clients/${clientId}/reports`);
}

export async function addDemoClient() {
  const client = await createDemoClient();
  redirect(`/clients/${client.id}`);
}
