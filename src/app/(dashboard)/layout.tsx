"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

interface ClientContextType {
  selectedClientId: string;
  selectedClientName: string;
  clients: Array<{ id: string; name: string }>;
  setSelectedClientId: (id: string) => void;
}

export const ClientContext = createContext<ClientContextType>({
  selectedClientId: "",
  selectedClientName: "",
  clients: [],
  setSelectedClientId: () => {},
});

export function useClient() {
  return useContext(ClientContext);
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedClientId, setSelectedClientId] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      signIn("auto", { callbackUrl: window.location.href });
    }
  }, [status]);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data: Array<{ id: string; name: string }>) => {
        if (!Array.isArray(data)) return;
        setClients(data);
        if (data.length > 0 && !selectedClientId) {
          const cn = new URLSearchParams(window.location.search).get("cn");
          const preselect = cn
            ? data.find((c) => c.name.toLowerCase().includes(cn.toLowerCase()))
            : null;
          setSelectedClientId(preselect ? preselect.id : data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <ClientContext.Provider
      value={{
        selectedClientId,
        selectedClientName: selectedClient?.name || "",
        clients,
        setSelectedClientId,
      }}
    >
      <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
        {/* Animated background */}
        <div className="dash-bg" aria-hidden="true">
          <div className="dash-bg-blob dash-bg-blob-1" />
          <div className="dash-bg-blob dash-bg-blob-2" />
          <div className="dash-bg-blob dash-bg-blob-3" />
        </div>

        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="lg:pl-56 flex flex-col min-h-screen relative z-10">
          <Header
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
            clientName={selectedClient?.name || ""}
            clients={clients}
            selectedClientId={selectedClientId}
            onClientChange={setSelectedClientId}
          />

          <main className="flex-1 p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </ClientContext.Provider>
  );
}
