"use client";

import { createContext, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";

// Zmiana zakresu / zakładki: stare liczby zostają, ale przygaszone, dopóki nie przyjdą nowe.
const PendingContext = createContext<{ pending: boolean; navigate: (href: string) => void }>({
  pending: false,
  navigate: () => {},
});

export function PendingProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate = (href: string) => startTransition(() => router.push(href, { scroll: false }));
  return <PendingContext.Provider value={{ pending, navigate }}>{children}</PendingContext.Provider>;
}

export const usePending = () => useContext(PendingContext);

export function PendingDim({ children }: { children: React.ReactNode }) {
  const { pending } = usePending();
  return (
    <div aria-busy={pending} className={`space-y-6 transition-opacity ${pending ? "pointer-events-none opacity-40" : ""}`}>
      {children}
    </div>
  );
}
