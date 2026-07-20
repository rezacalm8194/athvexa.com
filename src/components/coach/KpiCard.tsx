import type { ComponentType } from "react";

export default function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  loading = false,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  tone?: "neutral" | "warn";
  loading?: boolean;
}) {
  return (
    <div className="card flex items-center gap-3.5 p-4 transition-colors hover:border-white/10">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
          tone === "warn" ? "bg-red/15 text-red" : "bg-white/5 text-smoke-4"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="font-display text-2xl font-black leading-none text-white">
          {loading ? <span className="inline-block h-6 w-8 animate-pulse rounded bg-white/10 align-middle" /> : value}
        </div>
        <div className="mt-1 text-xs font-medium text-smoke-3">{label}</div>
      </div>
    </div>
  );
}
