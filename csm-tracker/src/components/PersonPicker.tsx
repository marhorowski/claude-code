"use client";

import { useEffect } from "react";
import { useApp } from "./AppContext";

// Wybór osoby, za której portfel wpisujemy dane. CSM widzi tylko siebie.
export function usePersonDefault(person: string, setPerson: (id: string) => void) {
  const { me, isLeader, users, scope } = useApp();
  useEffect(() => {
    if (!me || person) return;
    if (!isLeader) return setPerson(me.id);
    if (scope !== "team") return setPerson(scope);
    const firstCsm = users.find((u) => u.active && u.role === "CSM");
    if (firstCsm) setPerson(firstCsm.id);
    else if (users.length) setPerson(me.id);
  }, [me, isLeader, users, scope, person, setPerson]);
}

export function PersonPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { isLeader, users } = useApp();
  if (!isLeader) return null;
  return (
    <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
      Portfel:
      <select className="input-dark" style={{ width: "auto" }} value={value} onChange={(e) => onChange(e.target.value)}>
        {users.filter((u) => u.active).map((u) => (
          <option key={u.id} value={u.id}>{u.name}{u.role === "LIDER" ? " (lider)" : ""}</option>
        ))}
      </select>
    </label>
  );
}
