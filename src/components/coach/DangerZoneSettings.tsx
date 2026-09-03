"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmModal from "@/components/coach/shared/ConfirmModal";
import { t, type Locale } from "@/lib/i18n";

type Action = "revoke-invites" | "archive" | "delete";

export default function DangerZoneSettings({
  locale,
  teamId,
  teamName,
  canManage,
}: {
  locale: Locale;
  teamId: string | null;
  teamName: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function run(action: Action) {
    if (!teamId) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/coach/teams/${teamId}/danger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t(locale, "coach.settings.dangerError"));
      setPending(null);
      if (data.redirect) {
        router.push(data.redirect);
        router.refresh();
        return;
      }
      setSuccess(
        action === "revoke-invites"
          ? t(locale, "coach.settings.invitesRevoked", { count: data.revoked ?? 0 })
          : t(locale, "coach.settings.teamArchived")
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "coach.settings.dangerError"));
    } finally {
      setBusy(false);
    }
  }

  const confirmCopy: Record<Action, { title: string; body: string; label: string }> = {
    "revoke-invites": {
      title: t(locale, "coach.settings.removeInvites"),
      body: t(locale, "coach.settings.removeInvitesConfirm"),
      label: t(locale, "coach.settings.removeInvites"),
    },
    archive: {
      title: t(locale, "coach.settings.archiveTeam"),
      body: t(locale, "coach.settings.archiveTeamConfirm", { name: teamName }),
      label: t(locale, "coach.settings.archiveTeam"),
    },
    delete: {
      title: t(locale, "coach.settings.deleteWorkspace"),
      body: t(locale, "coach.settings.deleteWorkspaceConfirm", { name: teamName }),
      label: t(locale, "coach.settings.deleteWorkspace"),
    },
  };

  return (
    <section className="rounded-lg border border-red/25 bg-red/5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-white">{t(locale, "coach.settings.dangerTitle")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-smoke-3">{t(locale, "coach.settings.dangerDesc")}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          className="btn-ghost !px-3.5 !py-2 text-xs text-red-glow"
          type="button"
          disabled={!canManage || !teamId || busy}
          onClick={() => setPending("revoke-invites")}
        >
          {t(locale, "coach.settings.removeInvites")}
        </button>
        <button
          className="btn-ghost !px-3.5 !py-2 text-xs text-red-glow"
          type="button"
          disabled={!canManage || !teamId || busy}
          onClick={() => setPending("archive")}
        >
          {t(locale, "coach.settings.archiveTeam")}
        </button>
        <button
          className="btn-ghost !px-3.5 !py-2 text-xs text-red-glow"
          type="button"
          disabled={!canManage || !teamId || busy}
          onClick={() => setPending("delete")}
        >
          {t(locale, "coach.settings.deleteWorkspace")}
        </button>
      </div>
      {!canManage ? <p className="mt-3 text-xs text-smoke-4">{t(locale, "coach.settings.dangerOwnerOnly")}</p> : null}
      {error ? <p className="mt-4 text-sm text-red-glow">{error}</p> : null}
      {success ? <p className="mt-4 text-sm text-green-300">{success}</p> : null}
      <ConfirmModal
        open={Boolean(pending)}
        title={pending ? confirmCopy[pending].title : ""}
        description={pending ? confirmCopy[pending].body : ""}
        confirmLabel={pending ? confirmCopy[pending].label : t(locale, "common.cancel")}
        cancelLabel={t(locale, "common.cancel")}
        busy={busy}
        onConfirm={() => pending && run(pending)}
        onCancel={() => setPending(null)}
      />
    </section>
  );
}
