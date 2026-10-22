import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getCurrentClient } from "@/lib/clients";
import { logout } from "@/app/auth-actions";
import { CopyLink } from "@/components/CopyLink";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const [client, user] = await Promise.all([
    getCurrentClient(),
    prisma.user.findUniqueOrThrow({ where: { id: session.uid }, select: { name: true } }),
  ]);
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const formUrl = `${proto}://${host}/f/${client.formToken}`;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-semibold">{client.name}</span>
          <nav className="flex flex-wrap gap-4 text-sm">
            <Link href="/panel" className="text-slate-600 hover:text-slate-900">Wyniki</Link>
            <Link href="/panel/dane" className="text-slate-600 hover:text-slate-900">Dane</Link>
            <a href={formUrl} target="_blank" className="text-slate-600 hover:text-slate-900">Formularz ↗</a>
            {session.role === "ADMIN" && (
              <Link href="/panel/uzytkownicy" className="text-slate-600 hover:text-slate-900">Użytkownicy</Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <CopyLink url={formUrl} />
            <Link href="/panel/konto" className="text-slate-600 hover:text-slate-900">{user.name}</Link>
            <form action={logout}>
              <button className="text-slate-500 hover:text-slate-900">Wyloguj</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
