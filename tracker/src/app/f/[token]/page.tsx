import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { EntryForm } from "@/components/EntryForm";
import { submitPublicEntry } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function PublicFormPage({ params }: { params: { token: string } }) {
  const client = await prisma.client.findUnique({ where: { formToken: params.token } });
  if (!client) notFound();

  async function submit(form: Record<string, string>) {
    "use server";
    return submitPublicEntry(params.token, form);
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-xl font-semibold">Raport dzienny</h1>
      <p className="mb-6 text-sm text-slate-500">{client.name}</p>
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <EntryForm onSubmit={submit} />
      </div>
    </main>
  );
}
