"use client";

import { useEffect } from "react";

/** Rejestruje service workera (instalowalna PWA) i prosi o zgodę na powiadomienia. */
export default function PwaSetup() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if ("Notification" in window && Notification.permission === "default") {
      // prośba po pierwszej interakcji, żeby przeglądarka jej nie zablokowała
      const ask = () => {
        Notification.requestPermission();
        window.removeEventListener("pointerdown", ask);
      };
      window.addEventListener("pointerdown", ask, { once: true });
    }
  }, []);
  return null;
}
