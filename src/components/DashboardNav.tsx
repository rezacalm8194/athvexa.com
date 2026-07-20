"use client";

import { useRouter } from "next/navigation";

export default function DashboardNav({ name, roleLabel }: { name: string; roleLabel: string }) {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = `${process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://athvexa.com"}/login`;
  }

  return (
    <header className="flex items-center justify-between border-b border-white/5 bg-ink-2/80 px-6 py-4 backdrop-blur">
      <div className="font-display text-xl font-black tracking-wide text-white">
        ATH<span className="text-red">VEXA</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm font-semibold text-white">{name}</div>
          <div className="eyebrow">{roleLabel}</div>
        </div>
        <button onClick={signOut} className="btn-ghost !px-4 !py-2 text-xs">
          Sign out
        </button>
      </div>
    </header>
  );
}
