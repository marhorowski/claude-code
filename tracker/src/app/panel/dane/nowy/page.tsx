import Link from "next/link";
import { getCurrentClient } from "@/lib/clients";
import { AREAS, getArea } from "@/lib/fields";
import { EntryForm } from "@/components/EntryForm";
import { saveAdminEntry } from "@/app/actions";

export default async function NewEntryPage({ searchParams }: { searchParams: { area?: string } }) {
  const client = await getCurrentClient();
  const area = getArea(searchParams.area ?? "") ?? AREAS[0];

  async function save(form: Record<string, string>) {
    "use server";
    return saveAdminEntry(client.id, form);
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/panel/dane?area=${area.key}`} className="text-sm text-slate-500 hover:underline">← Dane</Link>
      <h1 className="mb-4 mt-2 text-xl font-semibold">Nowy wpis</h1>
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <EntryForm onSubmit={save} defaultArea={area.key} afterSaveHref={`/panel/dane?area=${area.key}`} />
      </div>
    </div>
  );
}
