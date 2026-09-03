"use client";

export default function SettingToggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-md border border-line-1 bg-ink-2 p-3 text-start disabled:opacity-70"
    >
      <span className="text-sm text-paper">{label}</span>
      <span dir="ltr" className={`relative h-6 w-11 shrink-0 rounded-full p-1 ${checked ? "bg-red" : "bg-white/10"}`}>
        <span
          className={`block h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
        />
      </span>
    </button>
  );
}
