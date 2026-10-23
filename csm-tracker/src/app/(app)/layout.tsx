"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { AppProvider } from "@/components/AppContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div style={{ color: "var(--text-muted)" }}>Ładowanie...</div>
      </div>
    );
  }

  return (
    <AppProvider>
      <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
        <div className="dash-bg" aria-hidden="true">
          <div className="dash-bg-blob dash-bg-blob-1" />
          <div className="dash-bg-blob dash-bg-blob-2" />
          <div className="dash-bg-blob dash-bg-blob-3" />
        </div>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="lg:pl-56 flex flex-col min-h-screen relative z-10">
          <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 p-4 lg:p-6 max-w-[1400px] w-full">{children}</main>
        </div>
      </div>
    </AppProvider>
  );
}
