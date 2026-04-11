"use client";

import { getKpiStatus, getStatusColor, KpiStatus } from "@/lib/calculations";
import { formatValue } from "@/lib/utils";

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

  const borderColor = {
    GOD: "rgba(234,179,8,0.35)",
    GREEN: "rgba(34,197,94,0.25)",
    ORANGE: "rgba(249,115,22,0.25)",
    RED: "rgba(239,68,68,0.25)",
  }[status];

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${borderColor}`,
        borderRadius: "0.75rem",
        padding: compact ? "1rem" : "1.25rem",
        transition: "transform 0.15s",
        cursor: "default",
      }}
      className="hover:scale-[1.01]"
    >
      <div style={{ color: "var(--text-muted)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
        {label}
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <div style={{ color, fontWeight: 800, fontSize: compact ? "1.5rem" : "1.875rem", letterSpacing: "-0.02em" }}>
          {formatValue(v, unit)}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>Cel</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: 600 }}>
            {formatValue(target, unit)}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar" style={{ marginBottom: "0.5rem" }}>
        <div
          className="progress-bar-fill"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color, fontSize: "0.75rem", fontWeight: 700 }}>{pct}% celu</span>
        {trend !== null && (
          <span style={{ color: trend >= 0 ? "#22C55E" : "#EF4444", fontSize: "0.72rem", fontWeight: 600 }}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
