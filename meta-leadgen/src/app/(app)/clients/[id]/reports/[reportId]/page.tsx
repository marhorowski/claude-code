import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { deleteReport } from "../../../../actions";
import { ReportView } from "@/components/ReportView";
import { ReportActions } from "@/components/ReportActions";
import type { ReportData } from "@/lib/report";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: { id: string; reportId: string } }) {
  const report = await prisma.report.findFirst({ where: { id: params.reportId, clientId: params.id } });
  if (!report) notFound();
  const h = headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  return (
    <div className="space-y-4">
      <ReportActions shareUrl={`${origin}/r/${report.shareToken}`} onDelete={deleteReport.bind(null, params.id, report.id)} />
      <ReportView data={report.data as unknown as ReportData} />
    </div>
  );
}
