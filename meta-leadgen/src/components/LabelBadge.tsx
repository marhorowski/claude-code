import { LABELS, type Label } from "@/lib/analytics/classify";

const STYLES: Record<Label, string> = {
  scale: "bg-emerald-600 text-white",
  winner: "bg-emerald-100 text-emerald-800",
  promising: "bg-sky-100 text-sky-800",
  neutral: "bg-slate-100 text-slate-700",
  learning: "bg-slate-100 text-slate-500",
  weak: "bg-amber-100 text-amber-800",
  kill: "bg-red-100 text-red-700",
  no_delivery: "bg-slate-50 text-slate-400",
};

export function LabelBadge({ label }: { label: Label }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[label]}`}>
      {LABELS[label].text}
    </span>
  );
}

export function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      title={active ? "Aktywna" : "Wyłączona"}
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`}
    />
  );
}
