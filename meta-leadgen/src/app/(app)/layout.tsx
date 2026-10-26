import Link from "next/link";
import { logout } from "../login/actions";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold">
              LeadGen <span className="text-indigo-600">Monitor</span>
            </Link>
            <nav className="flex gap-4 text-sm text-slate-600">
              <Link href="/" className="hover:text-slate-900">Klienci</Link>
              <Link href="/settings" className="hover:text-slate-900">Ustawienia</Link>
            </nav>
          </div>
          <form action={logout}>
            <button className="text-sm text-slate-500 hover:text-slate-900">Wyloguj</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
