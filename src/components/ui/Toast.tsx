"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
}

export function Toast({ message, type = "success", onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 fade-in">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium ${
          type === "success"
            ? "bg-green-500/20 border-green-500/40 text-green-400"
            : "bg-red-500/20 border-red-500/40 text-red-400"
        }`}
      >
        <span>{type === "success" ? "✓" : "✕"}</span>
        <span>{message}</span>
        <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
          ×
        </button>
      </div>
    </div>
  );
}
