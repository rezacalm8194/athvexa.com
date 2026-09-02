"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
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
            ? "Incorrect email, phone number, or password. Please check your credentials and try again."
            : data.error ?? "Something went wrong. Try again.";
        setError(message);
        if (res.status === 401) {
          setPassword("");
          passwordRef.current?.focus();
        }
        return;
      }
      router.push(!data.user?.onboardingCompletedAt ? "/onboarding/preferences" : data.user?.role === "PLAYER" ? "/dashboard/player" : "/dashboard/coach");
      router.refresh();
    } catch {
      setError("Could not sign in. Check the server database settings and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-smoke-4">Email address or phone number</span>
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
        <span className="text-xs font-medium text-smoke-4">Password</span>
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
        Keep me signed in
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
        {loading ? "Signing in…" : "Sign in to Athvexa"}
      </button>
      <p className="text-center text-sm text-smoke-3">
        New to Athvexa?{" "}
        <a href="/register" className="text-white hover:text-red-glow">
          Register free
        </a>
      </p>
    </form>
  );
}
