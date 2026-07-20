"use client";

import { useEffect, useMemo, useState } from "react";
import TeamRosterList, { type Member } from "@/components/coach/TeamRosterList";
import EmptyRosterState from "@/components/coach/EmptyRosterState";

export default function PlayersPageView({ canManageRoles }: { canManageRoles: boolean }) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  function loadRoster() {
    fetch("/api/coach/players")
      .then((r) => r.json())
      .then((data) => setMembers(data.players ?? []));
  }

  useEffect(() => {
    loadRoster();
  }, []);

  async function changeRole(id: string, role: Member["role"]) {
    setUpdatingId(id);
    const prev = members;
    setMembers((cur) => cur?.map((m) => (m.id === id ? { ...m, role } : m)) ?? cur);
    const res = await fetch(`/api/coach/players/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) setMembers(prev);
    else loadRoster();
    setUpdatingId(null);
  }

  const filtered = useMemo(() => {
    if (!members) return null;
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [members, query]);

  if (members !== null && members.length === 0) {
    return <EmptyRosterState teamName={null} />;
  }

  return (
    <div className="card p-5">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search players or assistants…"
        className="input-field mb-4"
      />

      {members === null && (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-md bg-white/5" />
          ))}
        </div>
      )}

      {filtered && filtered.length === 0 && members && members.length > 0 && (
        <p className="py-6 text-center text-sm text-smoke-3">No one matches &quot;{query}&quot;.</p>
      )}

      {filtered && filtered.length > 0 && (
        <TeamRosterList members={filtered} canManageRoles={canManageRoles} updatingId={updatingId} onChangeRole={changeRole} />
      )}
    </div>
  );
}
