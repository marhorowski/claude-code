"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ACTIVE_CLIENT_COOKIE, newFormToken } from "@/lib/clients";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/passwords";
import { isValidSheetUrl, syncAll } from "@/lib/sheets";
import type { FormState } from "./auth-actions";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type NewUser = { name: string; email: string; password: string };

/** Sprawdza dane nowego konta; zwraca komunikat błędu albo null. */
async function validateUser(u: NewUser): Promise<string | null> {
  if (!u.name) return "Podaj imię i nazwisko.";
  if (!EMAIL.test(u.email)) return "Podaj poprawny email.";
  if (u.password.length < MIN_PASSWORD_LENGTH) return `Hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków.`;
  if (await prisma.user.findUnique({ where: { email: u.email } })) return `Konto z emailem ${u.email} już istnieje.`;
  return null;
}

const readUser = (fd: FormData): NewUser => ({
  name: str(fd, "userName"),
  email: str(fd, "email").toLowerCase(),
  password: String(fd.get("password") ?? ""),
});

function refresh() {
  revalidatePath("/panel", "layout");
}

/** Przełącza firmę, której wyniki i dane ogląda administrator. */
export async function setActiveClient(id: string) {
  await requireAdmin();
  if (!(await prisma.client.findUnique({ where: { id }, select: { id: true } }))) return;
  cookies().set(ACTIVE_CLIENT_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 365 * 86_400 });
  refresh();
}

/** Nowa firma, opcjonalnie od razu z pierwszym kontem do logowania. */
export async function createClient(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const name = str(fd, "name");
  if (!name) return { error: "Podaj nazwę firmy." };
  const user = readUser(fd);
  const withUser = Boolean(user.name || user.email || user.password);
  if (withUser) {
    const error = await validateUser(user);
    if (error) return { error };
  }
  const client = await prisma.client.create({ data: { name, formToken: newFormToken() } });
  if (withUser) {
    await prisma.user.create({
      data: { name: user.name, email: user.email, role: "CLIENT", clientId: client.id, passwordHash: await hashPassword(user.password) },
    });
  }
  refresh();
  redirect(`/panel/klienci/${client.id}?nowy=1`);
}

export async function renameClient(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const name = str(fd, "name");
  if (!name) return { error: "Podaj nazwę firmy." };
  await prisma.client.update({ where: { id: str(fd, "clientId") }, data: { name } });
  refresh();
  return { ok: "Zapisano nazwę." };
}

/** Nowy link do formularza — stary przestaje działać (np. gdy wyciekł). */
export async function regenerateFormToken(clientId: string) {
  await requireAdmin();
  await prisma.client.update({ where: { id: clientId }, data: { formToken: newFormToken() } });
  refresh();
}

/** Usuwa firmę razem z jej wpisami i kontami. Wymaga przepisania nazwy. */
export async function deleteClient(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const client = await prisma.client.findUnique({ where: { id: str(fd, "clientId") } });
  if (!client) return { error: "Nie ma takiego klienta." };
  if (str(fd, "confirm") !== client.name) return { error: `Wpisz dokładnie „${client.name}”, żeby potwierdzić.` };
  await prisma.client.delete({ where: { id: client.id } });
  if (cookies().get(ACTIVE_CLIENT_COOKIE)?.value === client.id) cookies().delete(ACTIVE_CLIENT_COOKIE);
  refresh();
  redirect("/panel/klienci");
}

/** Konto do logowania: dla osoby z firmy (clientId) albo administratora (bez clientId). */
export async function createUser(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const clientId = str(fd, "clientId") || null;
  if (clientId && !(await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } }))) {
    return { error: "Nie ma takiego klienta." };
  }
  const user = readUser(fd);
  const error = await validateUser(user);
  if (error) return { error };
  await prisma.user.create({
    data: {
      name: user.name,
      email: user.email,
      role: clientId ? "CLIENT" : "ADMIN",
      clientId,
      passwordHash: await hashPassword(user.password),
    },
  });
  refresh();
  return { ok: `Dodano konto ${user.email}. Przekaż tej osobie email i hasło.` };
}

/** Podłącza arkusz: sprawdza adres pełną synchronizacją (wszystkie wpisy) i dopiero wtedy go zapisuje. */
export async function connectSheet(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const clientId = str(fd, "clientId");
  const url = str(fd, "url");
  if (!isValidSheetUrl(url)) {
    return { error: "To nie wygląda na adres wdrożenia Apps Script. Powinien zaczynać się od https://script.google.com/macros/s/ i kończyć na /exec." };
  }
  const reply = await syncAll(clientId, url);
  if (!reply.ok) return { error: `Arkusz nie przyjął danych: ${reply.error}` };
  await prisma.client.update({
    where: { id: clientId },
    data: { sheetUrl: url, sheetName: reply.name ?? null, sheetSyncedAt: new Date(), sheetError: null },
  });
  refresh();
  return { ok: `Połączono z arkuszem${reply.name ? ` „${reply.name}”` : ""} i wysłano wszystkie wpisy.` };
}

export async function resyncSheet(clientId: string): Promise<string> {
  await requireAdmin();
  const reply = await syncAll(clientId);
  refresh();
  return reply.ok ? "Wysłano wszystkie wpisy i odświeżono zakładki z formułami." : `Nie udało się: ${reply.error}`;
}

export async function disconnectSheet(clientId: string) {
  await requireAdmin();
  await prisma.client.update({ where: { id: clientId }, data: { sheetUrl: null, sheetName: null, sheetSyncedAt: null, sheetError: null } });
  refresh();
}

export async function setUserPassword(id: string, password: string): Promise<string | null> {
  await requireAdmin();
  if (password.length < MIN_PASSWORD_LENGTH) return `Hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków.`;
  await prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(password) } });
  return null;
}

export async function deleteUser(id: string) {
  const session = await requireAdmin();
  if (id === session.uid) return; // nie da się usunąć samego siebie
  await prisma.user.delete({ where: { id } });
  refresh();
}
