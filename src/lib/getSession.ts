import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

export async function getSessionOrAdmin() {
  const session = await getServerSession(authOptions);
  if (session) return session;

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!admin) return null;

  return {
    user: {
      id: admin.id,
      email: admin.email ?? "",
      name: admin.name,
      role: admin.role as string,
      clients: [] as Array<{ id: string; name: string }>,
    },
  };
}
