import { UserRowActions } from "./UserRowActions";

interface Row {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

const date = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", year: "numeric" });

export function UsersTable({ users, selfId, empty }: { users: Row[]; selfId: string; empty: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13.5px]">
        <thead>
          <tr className="text-left text-[12px] text-muted">
            <th className="px-5 py-2 font-medium">Osoba</th>
            <th className="px-3 py-2 font-medium">Email (login)</th>
            <th className="px-3 py-2 font-medium">Dodano</th>
            <th className="px-5 py-2" />
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && (
            <tr className="border-t border-line"><td colSpan={4} className="px-5 py-6 text-center text-muted">{empty}</td></tr>
          )}
          {users.map((u) => (
            <tr key={u.id} className="border-t border-line">
              <td className="px-5 py-2.5 font-medium">{u.name}</td>
              <td className="px-3 py-2.5 text-ink-2">{u.email}</td>
              <td className="tnum whitespace-nowrap px-3 py-2.5 text-muted">{date.format(u.createdAt)}</td>
              <td className="px-5 py-2.5 text-right"><UserRowActions id={u.id} email={u.email} isSelf={u.id === selfId} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
