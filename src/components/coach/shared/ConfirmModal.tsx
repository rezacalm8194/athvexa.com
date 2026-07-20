"use client";

import { AlertIcon } from "@/components/icons";

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-white/10 bg-ink-3 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${danger ? "bg-red/15 text-red" : "bg-white/10 text-smoke-4"}`}>
            <AlertIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-white">{title}</h3>
            <p className="mt-1 text-sm text-smoke-3">{description}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="btn-ghost !px-4 !py-2 text-xs" disabled={busy}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`!px-4 !py-2 text-xs ${danger ? "btn-primary" : "btn-primary"}`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
