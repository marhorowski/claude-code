"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";

const DISMISS_KEY = "ergon-notif-banner-dismissed";

/**
 * Baner na Pulpicie: prosi o zgodę na powiadomienia SYSTEMOWE
 * (pasek powiadomień telefonu / powiadomienia na komputerze).
 */
export default function NotifBanner() {
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    "unsupported"
  );
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if ("Notification" in window) setPerm(Notification.permission);
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (perm === "unsupported" || perm === "granted" || dismissed) return null;

  const enable = async () => {
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === "granted") {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification("Ergon", {
          body: "Powiadomienia włączone. Puls potencjału będzie przychodził tutaj.",
          icon: "/icon-192.png",
          tag: "ergon-enabled",
        });
      } catch {
        // brak SW — trudno, zgoda i tak nadana
      }
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="card border-bronze-500/40 px-4 py-3">
      <div className="flex items-start gap-3">
        {perm === "denied" ? (
          <BellOff className="mt-0.5 h-5 w-5 shrink-0 text-terra-400" />
        ) : (
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-bronze-300" />
        )}
        <div className="min-w-0 flex-1 text-sm text-stone2-200">
          {perm === "denied" ? (
            <>
              Powiadomienia systemowe są <b>zablokowane</b> dla tej strony.
              Odblokuj: kłódka/ikonka przy adresie → Powiadomienia → Zezwalaj,
              potem odśwież. Na telefonie: zainstaluj aplikację („Dodaj do
              ekranu głównego”) i włącz powiadomienia w ustawieniach aplikacji.
            </>
          ) : (
            <>
              Włącz powiadomienia systemowe, żeby Puls potencjału przychodził
              na pasek powiadomień telefonu i ekran komputera.
            </>
          )}
        </div>
        <button
          className="btn-ghost shrink-0 px-2"
          onClick={dismiss}
          title="Ukryj"
          aria-label="Ukryj baner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {perm !== "denied" && (
        <button
          className="btn-primary mt-3 w-full sm:w-auto"
          onClick={enable}
        >
          <Bell className="h-4 w-4" />
          Włącz powiadomienia
        </button>
      )}
    </div>
  );
}
