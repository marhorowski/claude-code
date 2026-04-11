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
        style={{
          background: type === "success" ? "rgba(0,255,136,0.1)" : "rgba(255,85,85,0.1)",
          border: `1px solid ${type === "success" ? "var(--neon-border)" : "rgba(255,85,85,0.35)"}`,
          color: type === "success" ? "var(--neon)" : "var(--red)",
          padding: "0.75rem 1rem",
          borderRadius: "0.75rem",
          fontSize: "0.875rem",
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          boxShadow: `0 4px 20px ${type === "success" ? "rgba(0,255,136,0.15)" : "rgba(255,85,85,0.15)"}`,
        }}
      >
        <span>{type === "success" ? "✓" : "✕"}</span>
        <span>{message}</span>
        <button onClick={onClose} style={{ opacity: 0.6, marginLeft: "0.5rem", cursor: "pointer" }}>×</button>
      </div>
    </div>
  );
}
