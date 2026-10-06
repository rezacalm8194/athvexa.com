"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { t, type Locale } from "@/lib/i18n";

type PlayerOption = { id: string; name: string; email: string | null };
type TeamOption = { id: string; name: string; playerCount: number };

export default function ProgramSendModal({
  programId,
  programName,
  locale,
  onClose,
  onSent,
}: {
  programId: string;
  programName: string;
  locale: Locale;
  onClose: () => void;
  onSent?: () => void;
}) {
  const { showToast } = useToast();
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [sendPlayerIds, setSendPlayerIds] = useState<string[]>([]);
  const [sendTeamId, setSendTeamId] = useState("");
  const [sendWholeTeam, setSendWholeTeam] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch(`/api/coach/programs/${programId}`).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/coach/players").then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/coach/teams").then((r) => (r.ok ? r.json() : Promise.reject())),
    ])
      .then(([programData, playersData, teamsData]) => {
        if (cancelled) return;
        const assigned: PlayerOption[] = (programData.program?.assignedPlayers ?? []).map(
          (player: { id: string; name: string; email: string | null }) => ({
            id: player.id,
            name: player.name,
            email: player.email,
          })
        );
        const roster: PlayerOption[] = (playersData.players ?? [])
          .filter((player: { role?: string }) => player.role === "PLAYER")
          .map((player: { id: string; name: string; email: string | null }) => ({
            id: player.id,
            name: player.name,
            email: player.email,
          }));
        const byId = new Map<string, PlayerOption>();
        for (const player of [...assigned, ...roster]) byId.set(player.id, player);
        const nextPlayers = Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
        setPlayers(nextPlayers);
        setSendPlayerIds(assigned.map((player) => player.id));

        const nextTeams: TeamOption[] = teamsData.teams ?? [];
        setTeams(nextTeams);
        setSendTeamId(teamsData.currentTeamId || nextTeams[0]?.id || "");
      })
      .catch(() => {
        if (cancelled) return;
        setPlayers([]);
        setTeams([]);
      });

    return () => {
      cancelled = true;
    };
  }, [programId]);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === sendTeamId) ?? null,
    [teams, sendTeamId]
  );

  function toggleSendPlayer(playerId: string) {
    setSendWholeTeam(false);
    setSendPlayerIds((current) =>
      current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId]
    );
  }

  function toggleWholeTeam() {
    setSendWholeTeam((current) => {
      const next = !current;
      if (next) setSendPlayerIds(players.map((player) => player.id));
      return next;
    });
  }

  async function sendProgram() {
    if (!sendWholeTeam && sendPlayerIds.length === 0) {
      showToast(t(locale, "coach.programs.selectRecipients"), "error");
      return;
    }
    setSending(true);
    const res = await fetch(`/api/coach/programs/${programId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        playerIds: sendWholeTeam && sendTeamId ? [] : sendPlayerIds,
        teamId: sendWholeTeam && sendTeamId ? sendTeamId : undefined,
      }),
    });
    setSending(false);
    if (res.ok) {
      const data = await res.json().catch(() => ({ sent: sendPlayerIds.length }));
      showToast(t(locale, "coach.programs.programSent", { count: data.sent ?? sendPlayerIds.length }), "success");
      onSent?.();
      onClose();
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? t(locale, "coach.programs.programSendError"), "error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-8"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-ink-3 p-5 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl font-bold text-white">{t(locale, "coach.programs.sendProgram")}</h2>
        <p className="mt-1 text-sm text-smoke-3">{programName}</p>
        <p className="mt-2 text-xs text-smoke-4">{t(locale, "coach.programs.sendProgramHint")}</p>

        {teams.length === 0 ? (
          <p className="mt-4 text-xs text-smoke-3">{t(locale, "coach.programs.noTeams")}</p>
        ) : (
          <label className="mt-4 block text-sm text-paper">
            <span className="eyebrow">{t(locale, "coach.programs.selectTeam")}</span>
            <select
              className="input-field mt-1 w-full !py-2 text-sm"
              value={sendTeamId}
              onChange={(e) => {
                setSendTeamId(e.target.value);
                setSendWholeTeam(false);
              }}
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                  {team.playerCount > 0
                    ? ` (${t(locale, "coach.programs.teamPlayerCount", { count: team.playerCount })})`
                    : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="mt-3 flex items-center gap-2 rounded px-1 py-1.5 text-sm text-paper">
          <input type="checkbox" className="accent-red" checked={sendWholeTeam} onChange={toggleWholeTeam} />
          <span>
            {t(locale, "coach.programs.sendToTeam")}
            {selectedTeam ? ` · ${selectedTeam.name}` : ""}
          </span>
        </label>

        <span className="eyebrow mt-3 block">{t(locale, "coach.programs.sendToPlayers")}</span>
        {players.length === 0 ? (
          <p className="mt-2 text-xs text-smoke-3">{t(locale, "coach.programs.noRoster")}</p>
        ) : (
          <div className="mt-2 max-h-52 overflow-y-auto rounded-md border border-line-1 p-2">
            {players.map((player) => (
              <label key={player.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-paper hover:bg-white/5">
                <input
                  type="checkbox"
                  className="accent-red"
                  checked={sendWholeTeam || sendPlayerIds.includes(player.id)}
                  onChange={() => toggleSendPlayer(player.id)}
                />
                <span>{player.name}</span>
                {player.email && <span className="text-xs text-smoke-4">{player.email}</span>}
              </label>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost !px-4 !py-2.5 text-sm" disabled={sending}>
            {t(locale, "common.cancel")}
          </button>
          <button type="button" onClick={sendProgram} className="btn-primary !px-4 !py-2.5 text-sm" disabled={sending}>
            {sending ? t(locale, "coach.programs.sendingProgram") : t(locale, "coach.programs.sendProgram")}
          </button>
        </div>
      </div>
    </div>
  );
}
