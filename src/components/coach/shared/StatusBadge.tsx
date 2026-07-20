const TONE_STYLE: Record<string, string> = {
  good: "bg-[#4CAF50]/15 text-[#4CAF50]",
  warn: "bg-[#FFC107]/15 text-[#FFC107]",
  bad: "bg-red/15 text-red-glow",
  neutral: "bg-white/10 text-smoke-3",
};

export default function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "good" | "warn" | "bad" | "neutral";
}) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE_STYLE[tone]}`}>
      {label}
    </span>
  );
}
