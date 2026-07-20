"use client";

type MemberRole = "PLAYER" | "ASSISTANT";

export type Member = {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  score: number;
  loggedToday: boolean;
  label: string;
  tone: "good" | "warn" | "bad";
};

const toneColor: Record<Member["tone"], string> = {
  good: "#4CAF50",
  warn: "#FFC107",
  bad: "#E02020",
};

export default function TeamRosterList({
  members,
  canManageRoles,
  updatingId,
  onChangeRole,
}: {
  members: Member[];
  canManageRoles: boolean;
  updatingId: string | null;
  onChangeRole: (id: string, role: MemberRole) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {members.map((m) => (
        <div key={m.id} className="flex items-center gap-3 rounded-md border border-white/5 bg-ink-3 p-3 transition-colors hover:border-white/10">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red/15 text-xs font-bold text-red">
            {m.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-white">{m.name}</span>
              {m.role === "ASSISTANT" && (
                <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-smoke-3">
                  Assistant
                </span>
              )}
            </div>
            <div className="truncate text-[11px]" style={{ color: m.role === "ASSISTANT" ? "#8a8f98" : toneColor[m.tone] }}>
              {m.role === "ASSISTANT" ? m.email : m.loggedToday ? m.label : "Not logged today"}
            </div>
          </div>
          {m.role === "PLAYER" && (
            <div className="font-display text-2xl font-black text-white">{m.loggedToday ? m.score : "—"}</div>
          )}
          {canManageRoles && (
            <select
              value={m.role}
              disabled={updatingId === m.id}
              onChange={(e) => onChangeRole(m.id, e.target.value as MemberRole)}
              className="rounded border border-line-1 bg-ink-2 px-2 py-1.5 text-xs text-smoke-3 disabled:opacity-50"
            >
              <option value="PLAYER">Player</option>
              <option value="ASSISTANT">Assistant</option>
            </select>
          )}
        </div>
      ))}
    </div>
  );
}
