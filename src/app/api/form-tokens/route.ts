import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "LIDER") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) return NextResponse.json([]);

  const tokens = await prisma.publicFormToken.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tokens);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "LIDER") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const { clientId, label, userId } = await req.json();
  if (!clientId) return NextResponse.json({ error: "Brak clientId" }, { status: 400 });

  const token = await prisma.publicFormToken.create({
    data: { clientId, label: label || "", userId: userId || null },
  });

  return NextResponse.json(token);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "LIDER") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Brak id" }, { status: 400 });

  await prisma.publicFormToken.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
