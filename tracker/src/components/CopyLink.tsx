"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded-lg border border-line-strong bg-card px-3 py-1.5 text-sm hover:bg-soft"
    >
      {copied ? "Skopiowano" : "Kopiuj link do formularza"}
    </button>
  );
}
