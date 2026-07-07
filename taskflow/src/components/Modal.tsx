"use client";

import { useEffect } from "react";

export default function Modal({
  onClose,
  children,
  wide,
}: {
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 md:p-10"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`card fade-in-up w-full ${
          wide ? "max-w-3xl" : "max-w-lg"
        } my-auto`}
      >
        <div className="meander rounded-t-xl" />
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
