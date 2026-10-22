import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { changePassword } from "@/app/auth-actions";
import { StatusForm } from "@/components/StatusForm";

export default async function AccountPage() {
  const session = await requireSession();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.uid } });

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Moje konto</h1>
        <p className="text-sm text-muted">{user.name} · {user.email}</p>
      </div>
      <div className="rounded-2xl bg-card p-5 border border-line shadow-card">
        <h2 className="mb-4 font-semibold">Zmiana hasła</h2>
        <StatusForm action={changePassword} submitLabel="Zmień hasło">
          <input type="email" name="username" autoComplete="username" defaultValue={user.email} hidden readOnly />
          <label className="block">
            <span className="label">Obecne hasło</span>
            <input name="current" type="password" required autoComplete="current-password" className="input" />
          </label>
          <label className="block">
            <span className="label">Nowe hasło</span>
            <input name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
          </label>
          <label className="block">
            <span className="label">Powtórz nowe hasło</span>
            <input name="repeat" type="password" required minLength={8} autoComplete="new-password" className="input" />
          </label>
        </StatusForm>
      </div>
    </div>
  );
}
