import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "LIDER")) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      clients: { include: { client: { select: { id: true, name: true } } } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "LIDER")) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const body = await req.json();
  const { email, password, name, role, clientIds } = body;

  if (!email || !password || !name || !role) {
    return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
  }

  // LIDER can only create CLOSER/SETTER
  if (session.user.role === "LIDER" && role !== "CLOSER" && role !== "SETTER") {
    return NextResponse.json({ error: "Lider może dodawać tylko Closerów i Setterów" }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email już istnieje" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name,
      role,
    },
  });

  if (clientIds && clientIds.length > 0) {
    for (const clientId of clientIds) {
      await prisma.clientAccess.create({
        data: { userId: user.id, clientId },
      });
    }
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });

  const body = await req.json();
  const { id, name, password, role, clientIds } = body;

  // Users can only update their own name/password
  if (session.user.role !== "ADMIN" && id !== session.user.id) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const updateData: any = {};
  if (name) updateData.name = name;
  if (password) updateData.password = await bcrypt.hash(password, 12);
  if (session.user.role === "ADMIN" && role) updateData.role = role;

  const user = await prisma.user.update({ where: { id }, data: updateData });

  if (session.user.role === "ADMIN" && clientIds !== undefined) {
    await prisma.clientAccess.deleteMany({ where: { userId: id } });
    for (const clientId of clientIds) {
      await prisma.clientAccess.create({ data: { userId: id, clientId } });
    }
  }

  return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Brak id" }, { status: 400 });

  if (id === session.user.id) {
    return NextResponse.json({ error: "Nie możesz usunąć własnego konta" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
