import { NextRequest, NextResponse } from "next/server";
import { getSessionOrAdmin } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionOrAdmin();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  await prisma.client.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionOrAdmin();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const body = await req.json();
  const { name, strategy, dataStartDate } = body;

  const client = await prisma.client.update({
    where: { id: params.id },
    data: {
      name,
      strategy,
      dataStartDate: dataStartDate ? new Date(dataStartDate) : undefined,
    },
  });

  return NextResponse.json(client);
}
