"use client";

import { useEffect, useRef, useState } from "react";

export default function WellnessSlider({
  label,
  value,
  color,
  onCommit,
}: {
  label: string;
  value: number | null;
  color: string;
  onCommit: (value: number) => void;
}) {
  const [local, setLocal] = useState(value ?? 3);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setLocal(value ?? 3), [value]);

  function handleChange(next: number) {
    setLocal(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onCommit(next), 500);
  }

  return (
    <div className="rounded-md border border-white/5 bg-ink-3 p-3">
      <div className="eyebrow mb-2">{label}</div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${label}: ${n} of 5`}
            onClick={() => handleChange(n)}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{ background: n <= local ? color : "#222222" }}
          />
        ))}
      </div>
    </div>
  );
}
