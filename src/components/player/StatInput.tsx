"use client";

import { useEffect, useRef, useState } from "react";

function toWesternDigits(raw: string) {
  return raw
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/٫/g, ".")
    .replace(",", ".");
}

function parseStat(raw: string): number | null {
  const normalized = toWesternDigits(raw).trim();
  if (!normalized || normalized === "." || normalized === "-") return null;
  const next = Number(normalized);
  return Number.isFinite(next) ? next : null;
}

function displayValue(value: number | null) {
  return value == null ? "" : String(value);
}

export default function StatInput({
  label,
  unit,
  value,
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
  const [text, setText] = useState(displayValue(value));
  const focused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!focused.current) setText(displayValue(value));
  }, [value]);

  function clamp(next: number) {
    return Math.min(max ?? next, Math.max(0, next));
  }

  function commit(raw: string) {
    const parsed = parseStat(raw);
    if (parsed == null) return;
    onCommit(clamp(parsed));
  }

  function handleChange(raw: string) {
    setText(raw);
    if (timer.current) clearTimeout(timer.current);
    if (parseStat(raw) == null) return;
    timer.current = setTimeout(() => commit(raw), 500);
  }

  return (
    <div className="rounded-md border border-white/5 bg-ink-3 p-3">
      <div className="eyebrow">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <input
          type="text"
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          dir="ltr"
          value={text}
          placeholder="0"
          onFocus={(event) => {
            focused.current = true;
            event.target.select();
          }}
          onBlur={() => {
            focused.current = false;
            if (timer.current) clearTimeout(timer.current);
            const parsed = parseStat(text);
            if (parsed == null) {
              setText(displayValue(value));
              return;
            }
            const next = clamp(parsed);
            setText(String(next));
            onCommit(next);
          }}
          onChange={(event) => handleChange(event.target.value)}
          className="w-20 bg-transparent text-xl font-bold outline-none"
          style={{ color: accent }}
          aria-label={label}
        />
        <span className="text-xs text-smoke-3">{unit}</span>
      </div>
    </div>
  );
}
