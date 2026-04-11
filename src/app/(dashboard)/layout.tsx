"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { useSession } from "next-auth/react";
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
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetch("/api/clients")
        .then((r) => r.json())
        .then((data: Array<{ id: string; name: string }>) => {
          setClients(data);
          if (data.length > 0 && !selectedClientId) {
            setSelectedClientId(data[0].id);
          }
        })
        .catch(() => {});
    }
  }, [session]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div style={{ color: "var(--text-muted)" }}>Ładowanie...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

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
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="lg:pl-56 flex flex-col min-h-screen">
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
