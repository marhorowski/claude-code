import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { EntryForm } from "@/components/EntryForm";
import { Logo } from "@/components/Logo";
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
      <Logo size={26} />
      <p className="eyebrow mt-8">{client.name}</p>
      <h1 className="mb-6 mt-1 text-[28px] font-extrabold tracking-[-0.02em]">Raport dzienny</h1>
      <div className="card p-6">
        <EntryForm onSubmit={submit} />
      </div>
    </main>
  );
}
