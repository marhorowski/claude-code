import { redirect } from "next/navigation";
import { getValidSession } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  if (await getValidSession()) redirect("/panel");
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-8">
      <h1 className="text-xl font-semibold">Logowanie</h1>
      <p className="mb-6 text-sm text-slate-500">Tracker marketingu i sprzedaży</p>
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <LoginForm next={searchParams.next ?? "/panel"} />
      </div>
    </main>
  );
}
