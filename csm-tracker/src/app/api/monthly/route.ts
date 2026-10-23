import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MONTHLY_FIELDS, MONTHLY_KEYS, sanitizeInputs } from "@/lib/fields";
import { canEditFor, intParam, pickInputs, requireUser } from "@/lib/server";

export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const p = new URL(req.url).searchParams;
  const year = intParam(p.get("year"), 2000, 2100);
  const month = intParam(p.get("month"), 1, 12);
  const userId = p.get("userId") || auth.user.id;
  if (!year || !month) return NextResponse.json({ error: "Nieprawidłowy okres" }, { status: 400 });
  if (!canEditFor(auth.user, userId)) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const entry = await prisma.monthlyEntry.findUnique({ where: { userId_year_month: { userId, year, month } } });
  return NextResponse.json(
    entry
      ? { values: pickInputs(entry as unknown as Record<string, unknown>, MONTHLY_KEYS), notes: entry.notes ?? "", updatedAt: entry.updatedAt }
      : null
  );
}

export async function PUT(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => ({}));
  const year = intParam(String(body.year), 2000, 2100);
  const month = intParam(String(body.month), 1, 12);
  const userId = typeof body.userId === "string" && body.userId ? body.userId : auth.user.id;
  if (!year || !month) return NextResponse.json({ error: "Nieprawidłowy okres" }, { status: 400 });
  if (!canEditFor(auth.user, userId)) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const values = sanitizeInputs(body.values, MONTHLY_FIELDS);
  const notes = typeof body.notes === "string" ? body.notes.slice(0, 5000) : null;
  const entry = await prisma.monthlyEntry.upsert({
    where: { userId_year_month: { userId, year, month } },
    create: { userId, year, month, ...values, notes },
    update: { ...values, notes },
  });
  return NextResponse.json({ success: true, updatedAt: entry.updatedAt });
}
