"use client";

import { useEffect, useRef, useState } from "react";

export default function StatInput({
  label,
  unit,
  value,
  step = 0.1,
  max,
  accent,
  onCommit,
}: {
  label: string;
  unit: string;
  value: number | null;
  step?: number;
  max?: number;
  accent: string;
  onCommit: (value: number) => void;
}) {
  const [local, setLocal] = useState(value ?? 0);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setLocal(value ?? 0), [value]);

  function handleChange(next: number) {
    setLocal(next);
    if (timer.current) clearTimeout(timer.current);
    // Auto-save on input, debounced 500ms.
    timer.current = setTimeout(() => onCommit(next), 500);
  }

  return (
    <div className="rounded-md border border-white/5 bg-ink-3 p-3">
      <div className="eyebrow">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <input
          type="number"
          step={step}
          min={0}
          max={max}
          value={local}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="w-16 bg-transparent text-xl font-bold outline-none"
          style={{ color: accent }}
          aria-label={label}
        />
        <span className="text-xs text-smoke-3">{unit}</span>
      </div>
    </div>
  );
}
