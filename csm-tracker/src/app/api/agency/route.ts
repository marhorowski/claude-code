import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AGENCY_FIELDS, AGENCY_KEYS, sanitizeInputs } from "@/lib/fields";
import { intParam, pickInputs, requireLeader } from "@/lib/server";

export async function GET(req: Request) {
  const auth = await requireLeader();
  if (auth.error) return auth.error;
  const p = new URL(req.url).searchParams;
  const year = intParam(p.get("year"), 2000, 2100);
  const month = intParam(p.get("month"), 1, 12);
  if (!year || !month) return NextResponse.json({ error: "Nieprawidłowy okres" }, { status: 400 });
  const row = await prisma.agencyMonth.findUnique({ where: { year_month: { year, month } } });
  return NextResponse.json(row ? { values: pickInputs(row as unknown as Record<string, unknown>, AGENCY_KEYS), updatedAt: row.updatedAt } : null);
}

export async function PUT(req: Request) {
  const auth = await requireLeader();
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => ({}));
  const year = intParam(String(body.year), 2000, 2100);
  const month = intParam(String(body.month), 1, 12);
  if (!year || !month) return NextResponse.json({ error: "Nieprawidłowy okres" }, { status: 400 });
  const values = sanitizeInputs(body.values, AGENCY_FIELDS);
  const row = await prisma.agencyMonth.upsert({
    where: { year_month: { year, month } },
    create: { year, month, ...values },
    update: values,
  });
  return NextResponse.json({ success: true, updatedAt: row.updatedAt });
}
