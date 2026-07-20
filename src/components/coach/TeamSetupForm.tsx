"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TeamSetupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sport: sport.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not create your team. Try again.");
        return;
      }
      router.push("/dashboard/coach");
      router.refresh();
    } catch {
      setError("Could not create your team. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-smoke-4">Team name</span>
        <input
          className="input-field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Persepolis U19"
          autoComplete="off"
          required
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-smoke-4">Sport (optional)</span>
        <input
          className="input-field"
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          placeholder="e.g. Football"
          autoComplete="off"
        />
      </label>

      {error && <p className="text-sm text-red-glow">{error}</p>}

      <button type="submit" className="btn-primary mt-1" disabled={loading}>
        {loading ? "Creating team…" : "Create team"}
      </button>
    </form>
  );
}
