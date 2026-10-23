import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeInputs, WEEKLY_FIELDS, WEEKLY_KEYS } from "@/lib/fields";
import { isMonday, parseIsoDate } from "@/lib/dates";
import { canEditFor, pickInputs, requireUser } from "@/lib/server";

function weekParam(v: unknown): Date | null {
  const d = typeof v === "string" ? parseIsoDate(v) : null;
  return d && isMonday(d) ? d : null;
}

export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const p = new URL(req.url).searchParams;
  const weekStart = weekParam(p.get("weekStart"));
  const userId = p.get("userId") || auth.user.id;
  if (!weekStart) return NextResponse.json({ error: "weekStart musi być poniedziałkiem (RRRR-MM-DD)" }, { status: 400 });
  if (!canEditFor(auth.user, userId)) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const entry = await prisma.weeklyEntry.findUnique({ where: { userId_weekStart: { userId, weekStart } } });
  return NextResponse.json(
    entry
      ? { values: pickInputs(entry as unknown as Record<string, unknown>, WEEKLY_KEYS), notes: entry.notes ?? "", updatedAt: entry.updatedAt }
      : null
  );
}

export async function PUT(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => ({}));
  const weekStart = weekParam(body.weekStart);
  const userId = typeof body.userId === "string" && body.userId ? body.userId : auth.user.id;
  if (!weekStart) return NextResponse.json({ error: "weekStart musi być poniedziałkiem (RRRR-MM-DD)" }, { status: 400 });
  if (!canEditFor(auth.user, userId)) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const values = sanitizeInputs(body.values, WEEKLY_FIELDS);
  const notes = typeof body.notes === "string" ? body.notes.slice(0, 5000) : null;
  const entry = await prisma.weeklyEntry.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    create: { userId, weekStart, ...values, notes },
    update: { ...values, notes },
  });
  return NextResponse.json({ success: true, updatedAt: entry.updatedAt });
}
