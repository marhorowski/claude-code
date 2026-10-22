import { headers } from "next/headers";
import Link from "next/link";
import { HeaderNav } from "@/components/HeaderNav";
import { Logo } from "@/components/Logo";
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
      <header className="sticky top-0 z-20 border-b border-line bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <Link href="/panel" aria-label="TrifectaOS — wyniki" className="shrink-0"><Logo size={22} /></Link>
          <span className="hidden h-5 w-px bg-line sm:block" aria-hidden />
          <span className="hidden truncate font-display font-bold text-ink-2 sm:block">{client.name}</span>
          <HeaderNav
            items={[
              { href: "/panel", label: "Wyniki" },
              { href: "/panel/dane", label: "Dane" },
              ...(session.role === "ADMIN" ? [{ href: "/panel/uzytkownicy", label: "Użytkownicy" }] : []),
              { href: "/panel/konto", label: "Moje konto" },
              { href: formUrl, label: "Formularz", external: true },
            ]}
          />
          <div className="ml-auto flex items-center gap-3 text-[13.5px]">
            <span className="hidden sm:block"><CopyLink url={formUrl} /></span>
            <span className="hidden text-ink-2 lg:block">{user.name}</span>
            <form action={logout}>
              <button className="text-muted hover:text-ink">Wyloguj</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
