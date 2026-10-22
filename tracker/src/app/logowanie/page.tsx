import { redirect } from "next/navigation";
import { getValidSession } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  if (await getValidSession()) redirect("/panel");
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-8">
      <Logo size={30} />
      <p className="eyebrow mt-8">Tracker marketingu i sprzedaży</p>
      <h1 className="mb-6 mt-1 text-[28px] font-extrabold tracking-[-0.02em]">Zaloguj się</h1>
      <div className="card p-6">
        <LoginForm next={searchParams.next ?? "/panel"} />
      </div>
    </main>
  );
}
