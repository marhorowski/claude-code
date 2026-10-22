import Link from "next/link";
import { AREAS, getArea } from "@/lib/fields";
import { EntryForm } from "@/components/EntryForm";
import { savePanelEntry } from "@/app/actions";

export default function NewEntryPage({ searchParams }: { searchParams: { area?: string } }) {
  const area = getArea(searchParams.area ?? "") ?? AREAS[0];

  async function save(form: Record<string, string>) {
    "use server";
    return savePanelEntry(form);
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
