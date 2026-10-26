"use client";

import { useState } from "react";

export function ReportActions({ shareUrl, onDelete }: { shareUrl: string; onDelete: () => Promise<void> }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <button
        className="btn"
        onClick={async () => {
          await navigator.clipboard.writeText(shareUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "Skopiowano ✓" : "Kopiuj link dla klienta"}
      </button>
      <button className="btn" onClick={() => window.print()}>Drukuj / PDF</button>
      <form
        action={onDelete}
        onSubmit={(e) => {
          if (!confirm("Usunąć ten raport? Link dla klienta przestanie działać.")) e.preventDefault();
        }}
      >
        <button className="btn-danger">Usuń raport</button>
      </form>
    </div>
  );
}
