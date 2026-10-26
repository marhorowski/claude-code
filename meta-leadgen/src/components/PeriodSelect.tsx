"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PERIOD_OPTIONS } from "@/lib/dates";

export function PeriodSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("d") ?? "7";
  return (
    <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm">
      {PERIOD_OPTIONS.map((d) => (
        <button
          key={d}
          onClick={() => {
            const next = new URLSearchParams(params);
            next.set("d", String(d));
            router.push(`${pathname}?${next}`);
          }}
          className={`rounded-md px-2.5 py-1 ${String(d) === current ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
        >
          {d} dni
        </button>
      ))}
    </div>
  );
}
