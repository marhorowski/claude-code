import { getKpiStatus, getStatusColor } from "@/lib/calculations";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  target: number;
  lowerIsBetter?: boolean;
  showLabel?: boolean;
  height?: string;
  className?: string;
}

export function ProgressBar({
  value,
  target,
  lowerIsBetter = false,
  showLabel = true,
  height = "h-2",
  className,
}: ProgressBarProps) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  const status = getKpiStatus(value, target, lowerIsBetter);
  const color = getStatusColor(status);

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("w-full bg-[#334155] rounded-full overflow-hidden", height)}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span className="text-xs font-semibold" style={{ color }}>
            {Math.round(pct)}%
          </span>
          <span className="text-xs text-slate-400">100%</span>
        </div>
      )}
    </div>
  );
}
