import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getCurrentClient } from "@/lib/clients";
import { createUser } from "@/app/auth-actions";
import { StatusForm } from "@/components/StatusForm";
import { DeleteUserButton } from "@/components/DeleteUserButton";

export default async function UsersPage() {
  const session = await requireAdmin();
  const client = await getCurrentClient();
  const users = await prisma.user.findMany({
    where: { OR: [{ role: "ADMIN" }, { clientId: client.id }] },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="overflow-x-auto rounded-2xl bg-card border border-line shadow-card">
        <h2 className="border-b border-line px-4 py-3 font-semibold">Konta</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="px-4 py-2 font-medium">Osoba</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Rola</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-3 py-2 text-ink-2">{u.email}</td>
                <td className="px-3 py-2">{u.role === "ADMIN" ? "Administrator" : `Klient: ${client.name}`}</td>
                <td className="px-4 py-2 text-right">
                  {u.id === session.uid ? <span className="text-xs text-muted">to Ty</span> : <DeleteUserButton id={u.id} email={u.email} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl bg-card p-5 border border-line shadow-card">
        <h2 className="mb-1 font-semibold">Dodaj konto</h2>
        <p className="mb-4 text-sm text-muted">Klient widzi tylko dane klienta „{client.name}”.</p>
        <StatusForm action={createUser} submitLabel="Dodaj konto">
          <label className="block">
            <span className="label">Imię i nazwisko</span>
            <input name="name" required autoComplete="off" className="input" />
          </label>
          <label className="block">
            <span className="label">Email</span>
            <input name="email" type="email" required autoComplete="off" className="input" />
          </label>
          <label className="block">
            <span className="label">Hasło startowe</span>
            <input name="password" type="text" required minLength={8} autoComplete="off" className="input" />
            <span className="mt-1 block text-xs text-muted">Min. 8 znaków. Osoba może je zmienić w „Moje konto”.</span>
          </label>
          <label className="block">
            <span className="label">Rola</span>
            <select name="role" defaultValue="CLIENT" className="input">
              <option value="CLIENT">Klient</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </label>
        </StatusForm>
      </section>
    </div>
  );
}
