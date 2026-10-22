import Link from "next/link";
import { headers } from "next/headers";
import { getCurrentClient } from "@/lib/clients";
import { CopyLink } from "@/components/CopyLink";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const client = await getCurrentClient();
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const formUrl = `${proto}://${host}/f/${client.formToken}`;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-semibold">{client.name}</span>
          <nav className="flex gap-4 text-sm">
            <Link href="/panel" className="text-slate-600 hover:text-slate-900">Wyniki</Link>
            <Link href="/panel/dane" className="text-slate-600 hover:text-slate-900">Dane</Link>
            <a href={formUrl} target="_blank" className="text-slate-600 hover:text-slate-900">Formularz ↗</a>
          </nav>
          <div className="ml-auto"><CopyLink url={formUrl} /></div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
