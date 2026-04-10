import { KpiStatus, getStatusColor, getStatusLabel } from "@/lib/calculations";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: KpiStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const bgClass = {
    GOD: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    GREEN: "bg-green-500/20 text-green-400 border-green-500/30",
    ORANGE: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    RED: "bg-red-500/20 text-red-400 border-red-500/30",
  }[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold border",
        bgClass,
        className
      )}
    >
      {getStatusLabel(status)}
    </span>
  );
}
