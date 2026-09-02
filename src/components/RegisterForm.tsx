"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = "PLAYER" | "COACH" | "ASSISTANT";
type ContactType = "email" | "phone";

export default function RegisterForm({
  inviteToken,
  inviteRole,
}: {
  inviteToken?: string;
  inviteRole?: "PLAYER" | "ASSISTANT" | "COACH";
}) {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(inviteToken ? inviteRole ?? "PLAYER" : null);
  const [name, setName] = useState("");
  const [contactType, setContactType] = useState<ContactType>("email");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contactType, contact, password, role, inviteToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }
      router.push("/onboarding/preferences");
      router.refresh();
    } catch {
      setError("Could not create your account. Check the server database settings and try again.");
    } finally {
      setLoading(false);
    }
  }

  // Step 1 — the required "player or coach" choice.
  if (!role) {
    return (
      <div className="flex flex-col gap-3">
        <RoleCard
          label="I'm a player"
          description="Log your daily readiness, training and recovery."
          onClick={() => setRole("PLAYER")}
        />
        <RoleCard
          label="I'm a coach"
          description="Track your roster and send daily guidance."
          onClick={() => setRole("COACH")}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setRole(inviteToken ? role : null)}
        disabled={Boolean(inviteToken)}
        className="self-start text-xs font-medium text-smoke-3 hover:text-white disabled:opacity-40 disabled:hover:text-smoke-3"
      >
        ← {role === "PLAYER" ? "Player" : role === "ASSISTANT" ? "Assistant coach" : "Coach"} account · change
      </button>

      <Field label="Your name">
        <input
          className="input-field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={role === "PLAYER" ? "Ali Hassan" : role === "ASSISTANT" ? "Assistant name" : "Coach Ali"}
          autoComplete="name"
          required
        />
      </Field>
      <div className="grid grid-cols-2 gap-1 rounded-md border border-line-1 bg-ink-2 p-1" role="group" aria-label="Registration method">
        {(["email", "phone"] as const).map((type) => (
          <button
            key={type}
            type="button"
            aria-pressed={contactType === type}
            onClick={() => { setContactType(type); setContact(""); setError(null); }}
            className={`min-h-11 rounded px-3 text-sm font-medium transition-colors ${contactType === type ? "bg-ink-4 text-white shadow-sm" : "text-smoke-3 hover:text-white"}`}
          >
            {type === "email" ? "Email" : "Phone number"}
          </button>
        ))}
      </div>
      <Field label={contactType === "email" ? "Email address" : "Phone number"}>
        <input
          className="input-field"
          type={contactType === "email" ? "email" : "tel"}
          inputMode={contactType === "email" ? "email" : "tel"}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={contactType === "email" ? "you@email.com" : "+98 912 123 4567"}
          autoComplete={contactType === "email" ? "email" : "tel"}
          required
        />
      </Field>
      <Field label="Password">
        <input
          className="input-field"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 8 characters"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      {error && <p className="text-sm text-red-glow">{error}</p>}

      <button type="submit" className="btn-primary mt-1" disabled={loading}>
        {loading ? "Creating account…" : "Create free account"}
      </button>
      <p className="text-center text-sm text-smoke-3">
        Already have an account?{" "}
        <a href="/login" className="text-white hover:text-red-glow">
          Sign in
        </a>
      </p>
    </form>
  );
}

function RoleCard({
  label,
  description,
  onClick,
}: {
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-start gap-1 rounded-md border border-line-1 bg-ink-3 px-5 py-4 text-left transition-colors hover:border-red"
    >
      <span className="font-display text-lg font-bold tracking-wide text-white group-hover:text-red-glow">
        {label}
      </span>
      <span className="text-sm text-smoke-3">{description}</span>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-smoke-4">{label}</span>
      {children}
    </label>
  );
}
