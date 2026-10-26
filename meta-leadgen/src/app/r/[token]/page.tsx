import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ReportView } from "@/components/ReportView";
import type { ReportData } from "@/lib/report";

export const dynamic = "force-dynamic";

// Publiczny, tylko do odczytu widok raportu dla klienta (dostęp po losowym tokenie).
export default async function SharedReport({ params }: { params: { token: string } }) {
  const report = await prisma.report.findUnique({ where: { shareToken: params.token } });
  if (!report) notFound();
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <ReportView data={report.data as unknown as ReportData} />
    </main>
  );
}
