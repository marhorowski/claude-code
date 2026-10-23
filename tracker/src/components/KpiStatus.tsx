import { STATUS_INFO, type KpiStatus } from "@/lib/kpi";

// Pełne nazwy klas (Tailwind musi je znaleźć w kodzie).
export const STATUS_BG: Record<KpiStatus, string> = { god: "bg-god", on: "bg-up", below: "bg-warn", critical: "bg-down" };
const CHIP: Record<KpiStatus, string> = {
  god: "bg-god/10 text-god",
  on: "bg-up/10 text-up",
  below: "bg-warn/10 text-warn",
  critical: "bg-down/10 text-down",
};

export function StatusChip({ status, className = "" }: { status: KpiStatus; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${CHIP[status]} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_BG[status]}`} aria-hidden />
      {STATUS_INFO[status].label}
    </span>
  );
}

export function StatusDot({ status }: { status: KpiStatus }) {
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${STATUS_BG[status]}`} title={STATUS_INFO[status].label} aria-label={STATUS_INFO[status].label} />;
}
