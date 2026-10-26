"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Po dodaniu konta uruchamia pierwszą synchronizację (90 dni) i odświeża widok.
export function FirstSync({ clientId }: { clientId: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const started = useRef(false);
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (params.get("firstSync") !== "1" || started.current) return;
    started.current = true;
    setState("running");
    fetch(`/api/clients/${clientId}/sync`, { method: "POST" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        setState("done");
        setMsg(`Pobrano ${body.days} dni: ${body.rows} wierszy, ${Math.round(body.leads)} leadów, ${Math.round(body.bookings)} spotkań.`);
        router.replace(pathname);
        router.refresh();
      })
      .catch((e) => {
        setState("error");
        setMsg(e.message);
      });
  }, [params, clientId, router, pathname]);

  if (state === "idle") return null;
  const style = state === "error" ? "bg-red-50 text-red-800" : state === "done" ? "bg-emerald-50 text-emerald-900" : "bg-indigo-50 text-indigo-900";
  return (
    <div className={`rounded-lg p-3 text-sm ${style}`}>
      {state === "running" && "Pierwsza synchronizacja: pobieram dane z ostatnich 90 dni. Przy dużych kontach może to potrwać 1–3 minuty…"}
      {state !== "running" && msg}
    </div>
  );
}
