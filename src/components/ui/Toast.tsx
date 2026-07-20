"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircleIcon, AlertIcon } from "@/components/icons";

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLE: Record<ToastTone, string> = {
  success: "border-[#4CAF50]/40 bg-ink-3 text-white",
  error: "border-red/40 bg-ink-3 text-white",
  info: "border-line-2 bg-ink-3 text-white",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = ++idRef.current;
    setItems((cur) => [...cur, { id, message, tone }]);
    setTimeout(() => {
      setItems((cur) => cur.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
        {items.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex max-w-sm items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium shadow-lg shadow-black/40 ${TONE_STYLE[item.tone]}`}
          >
            {item.tone === "error" ? (
              <AlertIcon className="h-4 w-4 shrink-0 text-red-glow" />
            ) : (
              <CheckCircleIcon className="h-4 w-4 shrink-0 text-[#4CAF50]" />
            )}
            <span>{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fail soft: components can still render outside the provider in isolation/tests.
    return { showToast: () => {} };
  }
  return ctx;
}
