import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ClientTabs } from "@/components/ClientTabs";
import { PeriodSelect } from "@/components/PeriodSelect";
import { SyncButton } from "@/components/SyncButton";
import { FirstSync } from "@/components/FirstSync";

export default async function ClientLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  const client = await prisma.client.findUnique({ where: { id: params.id } });
  if (!client) notFound();
  const demo = client.adAccountId.startsWith("demo");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{client.name}</h1>
          <p className="text-xs text-slate-500">
            {demo ? "Konto demo z przykładowymi danymi" : `act_${client.adAccountId}`} · {client.currency} · cel kosztu spotkania{" "}
            {client.targetCostPerBooking.toLocaleString("pl-PL")} {client.currency}
            {client.lastSyncAt && (
              <>
                {" "}· ostatnia synchronizacja{" "}
                {client.lastSyncAt.toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short", timeZone: client.timezone })}
              </>
            )}
          </p>
          {client.lastSyncStatus === "error" && <p className="mt-1 text-xs text-red-600">Ostatnia synchronizacja nie powiodła się: {client.lastSyncMessage}</p>}
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          {!demo && <SyncButton clientId={client.id} />}
          <PeriodSelect />
        </div>
      </div>
      <FirstSync clientId={client.id} />
      <ClientTabs clientId={client.id} />
      {children}
    </div>
  );
}
