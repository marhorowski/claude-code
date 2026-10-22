import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { requireSession } from "./auth";

const DEFAULT_CLIENT_ID = "klient-testowy";

/**
 * Do etapu z panelem klientów admin pracuje na jednym kliencie testowym o stałym id.
 * Przy równoległym pierwszym wejściu (layout i strona) drugi zapis trafia na
 * unikalny klucz — wtedy po prostu czytamy klienta założonego przez pierwszy.
 */
async function getDefaultClient() {
  const existing = await prisma.client.findUnique({ where: { id: DEFAULT_CLIENT_ID } });
  if (existing) return existing;
  try {
    return await prisma.client.create({
      data: { id: DEFAULT_CLIENT_ID, name: "Klient testowy", formToken: randomBytes(18).toString("base64url") },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return prisma.client.findUniqueOrThrow({ where: { id: DEFAULT_CLIENT_ID } });
    }
    throw e;
  }
}

/** Klient, którego dane ogląda zalogowana osoba: konto klienta → jego klient, admin → klient testowy. */
export async function getCurrentClient() {
  const session = await requireSession();
  if (session.role === "CLIENT" && session.cid) {
    return prisma.client.findUniqueOrThrow({ where: { id: session.cid } });
  }
  return getDefaultClient();
}
