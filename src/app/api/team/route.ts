import { NextRequest, NextResponse } from "next/server";
import { getSessionOrAdmin } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSessionOrAdmin();
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "LIDER") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "Brak clientId" }, { status: 400 });

  const accesses = await prisma.clientAccess.findMany({
    where: {
      clientId,
      user: { role: { in: ["CLOSER", "SETTER"] } },
    },
    include: {
      user: { select: { id: true, name: true, role: true } },
    },
  });

  const users = accesses.map((a) => a.user);
  return NextResponse.json(users);
}
