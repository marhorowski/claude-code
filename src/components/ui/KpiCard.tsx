"use client";

import { getKpiStatus, getStatusColor, KpiStatus } from "@/lib/calculations";
import { formatValue } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: number | null | undefined;
  target: number;
  unit: string;
  lowerIsBetter?: boolean;
  previousValue?: number | null;
  compact?: boolean;
}

export function KpiCard({
  label,
  value,
  target,
  unit,
  lowerIsBetter = false,
  previousValue,
  compact = false,
}: KpiCardProps) {
  const v = value ?? 0;
  const status: KpiStatus = getKpiStatus(v, target, lowerIsBetter);
  const color = getStatusColor(status);
  const pct = target > 0 ? Math.round((v / target) * 100) : 0;

  const trend =
    previousValue !== undefined && previousValue !== null && previousValue !== 0
      ? ((v - previousValue) / Math.abs(previousValue)) * 100
      : null;

  const bgClass = {
    GOD: "border-yellow-500/40",
    GREEN: "border-green-500/30",
    ORANGE: "border-orange-500/30",
    RED: "border-red-500/30",
  }[status];

  return (
    <div
      className={cn(
        "bg-[#1E293B] border rounded-xl p-4 transition-all hover:scale-[1.01]",
        bgClass
      )}
    >
      <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
        {label}
      </div>

      <div className="flex items-end justify-between mb-3">
        <div
          className={cn("font-bold", compact ? "text-2xl" : "text-3xl")}
          style={{ color }}
        >
          {formatValue(v, unit)}
        </div>
        <div className="text-right">
          <div className="text-slate-400 text-xs">Cel</div>
          <div className="text-slate-300 text-sm font-medium">
            {formatValue(target, unit)}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar mb-2">
        <div
          className="progress-bar-fill"
          style={{
            width: `${Math.min(pct, 100)}%`,
            backgroundColor: color,
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color }}>
          {pct}% celu
        </span>
        {trend !== null && (
          <span
            className={cn(
              "text-xs font-medium flex items-center gap-0.5",
              trend >= 0 ? "text-green-400" : "text-red-400"
            )}
          >
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
