"use client";

import { useState } from "react";
import { authRedirectUrl } from "@/lib/clientRedirect";

export default function LoginForm() {
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ email, password, remember }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }
      window.location.href = authRedirectUrl(data.user?.role, data.user?.redirectTo);
    } catch {
      setError("Could not sign in. Check the server database settings and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-smoke-4">Email address</span>
        <input
          className="input-field"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="coach@email.com"
          autoComplete="email"
          required
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-smoke-4">Password</span>
        <input
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

      {error && <p className="text-sm text-red-glow">{error}</p>}

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
