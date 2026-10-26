import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { resolveMapping } from "@/lib/meta/actions";
import { ClientSettingsForm } from "./ClientSettingsForm";

export const dynamic = "force-dynamic";

export default async function ClientSettingsPage({ params }: { params: { id: string } }) {
  const client = await prisma.client.findUnique({ where: { id: params.id } });
  if (!client) notFound();
  return <ClientSettingsForm client={client} resolved={resolveMapping(client, client.detectedActionTypes)} />;
}
