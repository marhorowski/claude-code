import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentClient } from "@/lib/clients";
import { getArea, type Area } from "@/lib/fields";
import { toIso } from "@/lib/periods";
import { EntryForm } from "@/components/EntryForm";
import { savePanelEntry } from "@/app/actions";

export default async function EditEntryPage({ params }: { params: { id: string } }) {
  const client = await getCurrentClient();
  const entry = await prisma.entry.findFirst({ where: { id: params.id, clientId: client.id } });
  if (!entry) notFound();
  const area = getArea(entry.area)!;

  async function save(form: Record<string, string>) {
    "use server";
    return savePanelEntry(form, params.id);
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/panel/dane?area=${area.key}`} className="text-sm text-slate-500 hover:underline">← Dane</Link>
      <h1 className="mb-4 mt-2 text-xl font-semibold">Edycja wpisu: {area.label}</h1>
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <EntryForm
          onSubmit={save}
          lockArea
          afterSaveHref={`/panel/dane?area=${area.key}`}
          initial={{
            area: entry.area as Area,
            dateFrom: toIso(entry.dateFrom),
            dateTo: toIso(entry.dateTo),
            values: entry.values as Record<string, number>,
            notes: entry.notes,
          }}
        />
      </div>
    </div>
  );
}
