"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

export default function LoginForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const passwordRef = useRef<HTMLInputElement>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, remember }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          res.status === 401
            ? t(locale, "auth.invalidLogin")
            : data.error ?? t(locale, "auth.genericError");
        setError(message);
        if (res.status === 401) {
          setPassword("");
          passwordRef.current?.focus();
        }
        return;
      }
      const fallback = !data.user?.onboardingCompletedAt ? "/onboarding/preferences" : data.user?.role === "PLAYER" ? "/dashboard/player" : "/dashboard/coach";
      router.push(nextPath?.startsWith("/") ? nextPath : fallback);
      router.refresh();
    } catch {
      setError(t(locale, "auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-smoke-4">{t(locale, "auth.emailOrPhone")}</span>
        <input
          className="input-field"
          type="text"
          inputMode="email"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="you@email.com or +98 912 123 4567"
          autoComplete="username"
          required
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-smoke-4">{t(locale, "auth.password")}</span>
        <input
          ref={passwordRef}
          className="input-field"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-smoke-4">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="h-4 w-4 rounded border-line-2 bg-ink-3 accent-red"
        />
        {t(locale, "auth.remember")}
      </label>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-lg border border-red/50 bg-red/10 px-3 py-2.5 text-sm font-medium text-red-glow"
        >
          {error}
        </div>
      )}

      <button type="submit" className="btn-primary mt-1" disabled={loading}>
        {loading ? t(locale, "auth.signingIn") : t(locale, "auth.signInToAthvexa")}
      </button>
      <p className="text-center text-sm text-smoke-3">
        {t(locale, "auth.newHere")}{" "}
        <a href="/register" className="text-white hover:text-red-glow">
          {t(locale, "auth.register")}
        </a>
      </p>
    </form>
  );
}
