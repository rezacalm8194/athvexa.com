"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import KpiCard from "@/components/coach/KpiCard";
import SearchInput from "@/components/coach/shared/SearchInput";
import StatusFilter from "@/components/coach/shared/StatusFilter";
import StatusBadge from "@/components/coach/shared/StatusBadge";
import EmptyState from "@/components/coach/shared/EmptyState";
import ErrorState from "@/components/coach/shared/ErrorState";
import { SkeletonCards, SkeletonRows } from "@/components/coach/shared/LoadingSkeleton";
import ConfirmModal from "@/components/coach/shared/ConfirmModal";
import ProgramFormModal, { emptyProgramForm, type ProgramFormValues } from "@/components/coach/programs/ProgramFormModal";
import ProgramDetailModal from "@/components/coach/programs/ProgramDetailModal";
import { useToast } from "@/components/ui/Toast";
import { t, type Locale } from "@/lib/i18n";
import {
  ClipboardListIcon,
  PlusIcon,
  UsersIcon,
  CheckCircleIcon,
  AlertIcon,
} from "@/components/icons";

type ProgramStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

type ProgramRow = {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  durationWeeks: number;
  sessionsPerWeek: number;
  startDate: string | null;
  endDate: string | null;
  status: ProgramStatus;
  assignedCount: number;
  createdAt: string;
  updatedAt: string;
};

type Kpis = { active: number; draft: number; archived: number; assignedPlayers: number };

const STATUS_TONE: Record<ProgramStatus, "good" | "neutral" | "warn"> = {
  ACTIVE: "good",
  DRAFT: "neutral",
  ARCHIVED: "warn",
};

function programStatusLabel(status: ProgramStatus, locale: Locale) {
  if (status === "ACTIVE") return t(locale, "coach.programs.statusActive");
  if (status === "DRAFT") return t(locale, "coach.programs.statusDraft");
  return t(locale, "coach.programs.statusArchived");
}

export default function ProgramsPageView({ locale }: { locale: Locale }) {
  const { showToast } = useToast();

  const [programs, setPrograms] = useState<ProgramRow[] | null>(null);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [error, setError] = useState(false);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ProgramStatus>("all");

  const [formModal, setFormModal] = useState<{ mode: "create" | "edit"; id?: string; values: ProgramFormValues } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ id: string; name: string; kind: "archive" | "delete" | "restore" } | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  const filterOptions = useMemo(
    () => [
      { value: "all" as const, label: t(locale, "coach.programs.filterAll") },
      { value: "ACTIVE" as const, label: t(locale, "coach.programs.filterActive") },
      { value: "DRAFT" as const, label: t(locale, "coach.programs.filterDraft") },
      { value: "ARCHIVED" as const, label: t(locale, "coach.programs.filterArchived") },
    ],
    [locale]
  );

  const load = useCallback(() => {
    setError(false);
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    if (status !== "all") params.set("status", status);

    fetch(`/api/coach/programs?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setPrograms(data.programs ?? []);
        setKpis(data.kpis ?? null);
      })
      .catch(() => setError(true));
  }, [query, status]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);

  function openCreate() {
    setFormModal({ mode: "create", values: emptyProgramForm() });
  }

  async function openEdit(id: string) {
    const res = await fetch(`/api/coach/programs/${id}`);
    if (!res.ok) {
      showToast(t(locale, "coach.programs.loadOneError"), "error");
      return;
    }
    const { program } = await res.json();
    setFormModal({
      mode: "edit",
      id,
      values: {
        name: program.name,
        description: program.description ?? "",
        goal: program.goal ?? "",
        durationWeeks: String(program.durationWeeks),
        sessionsPerWeek: String(program.sessionsPerWeek),
        startDate: program.startDate ?? "",
        endDate: program.endDate ?? "",
        status: program.status,
        playerIds: program.assignedPlayers.map((p: { id: string }) => p.id),
        sessions: program.sessions.map((s: { id: string; title: string; day: string; durationMinutes: number | null; intensity: "LOW" | "MEDIUM" | "HIGH"; notes: string | null }) => ({
          key: s.id,
          title: s.title,
          day: s.day,
          durationMinutes: s.durationMinutes != null ? String(s.durationMinutes) : "",
          intensity: s.intensity,
          notes: s.notes ?? "",
        })),
      },
    });
  }

  async function duplicate(id: string) {
    const res = await fetch(`/api/coach/programs/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate" }),
    });
    if (res.ok) {
      showToast(t(locale, "coach.programs.duplicated"), "success");
      load();
    } else {
      showToast(t(locale, "coach.programs.duplicateError"), "error");
    }
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;
    setBusyAction(true);

    if (pendingAction.kind === "delete") {
      const res = await fetch(`/api/coach/programs/${pendingAction.id}`, { method: "DELETE" });
      if (res.ok) {
        showToast(t(locale, "coach.programs.deleted"), "success");
        load();
      } else {
        showToast(t(locale, "coach.programs.deleteError"), "error");
      }
    } else {
      const action = pendingAction.kind;
      const res = await fetch(`/api/coach/programs/${pendingAction.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        showToast(
          action === "archive" ? t(locale, "coach.programs.archived") : t(locale, "coach.programs.restored"),
          "success"
        );
        load();
      } else {
        showToast(t(locale, "coach.programs.updateError"), "error");
      }
    }

    setBusyAction(false);
    setPendingAction(null);
  }

  const hasAnyPrograms = programs !== null && programs.length > 0;
  const noResultsFromFilter = programs !== null && programs.length === 0 && (query.trim() !== "" || status !== "all");
  const trueEmpty = programs !== null && programs.length === 0 && query.trim() === "" && status === "all";

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis === null && !error ? (
          <SkeletonCards count={4} />
        ) : (
          <>
            <KpiCard label={t(locale, "coach.programs.kpiActive")} value={kpis?.active ?? 0} icon={CheckCircleIcon} />
            <KpiCard label={t(locale, "coach.programs.kpiDrafts")} value={kpis?.draft ?? 0} icon={ClipboardListIcon} />
            <KpiCard label={t(locale, "coach.programs.kpiArchived")} value={kpis?.archived ?? 0} icon={AlertIcon} tone={kpis && kpis.archived > 0 ? "warn" : "neutral"} />
            <KpiCard label={t(locale, "coach.programs.kpiAssigned")} value={kpis?.assignedPlayers ?? 0} icon={UsersIcon} />
          </>
        )}
      </div>

      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <SearchInput value={query} onChange={setQuery} placeholder={t(locale, "coach.programs.search")} className="max-w-xs" />
            <StatusFilter value={status} onChange={setStatus} options={filterOptions} />
          </div>
          <button onClick={openCreate} className="btn-primary !px-4 !py-2.5 text-sm">
            <PlusIcon className="mr-1.5 h-4 w-4" />
            {t(locale, "coach.programs.newProgram")}
          </button>
        </div>

        {programs === null && !error && <SkeletonRows count={4} height="h-[86px]" />}

        {error && <ErrorState message={t(locale, "coach.programs.loadError")} onRetry={load} />}

        {trueEmpty && (
          <EmptyState
            icon={ClipboardListIcon}
            title={t(locale, "coach.programs.emptyTitle")}
            description={t(locale, "coach.programs.emptyBody")}
            action={
              <button onClick={openCreate} className="btn-primary !px-5 !py-3 text-sm">
                <PlusIcon className="mr-1.5 h-4 w-4" />
                {t(locale, "coach.programs.createFirst")}
              </button>
            }
          />
        )}

        {noResultsFromFilter && (
          <p className="py-10 text-center text-sm text-smoke-3">{t(locale, "coach.programs.noMatch")}</p>
        )}

        {hasAnyPrograms && (
          <div className="flex flex-col gap-2">
            {programs!.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-white/5 bg-ink-3 p-4 transition-colors hover:border-white/10"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setDetailId(p.id)} className="truncate text-left text-sm font-semibold text-white hover:underline">
                      {p.name}
                    </button>
                    <StatusBadge label={programStatusLabel(p.status, locale)} tone={STATUS_TONE[p.status]} />
                  </div>
                  <div className="mt-0.5 truncate text-xs text-smoke-3">
                    {p.goal ? `${p.goal} · ` : ""}
                    {t(locale, "coach.programs.metaLine", {
                      weeks: p.durationWeeks,
                      sessions: p.sessionsPerWeek,
                      count: p.assignedCount,
                      players: p.assignedCount === 1 ? t(locale, "coach.programs.player") : t(locale, "coach.programs.players"),
                    })}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <button onClick={() => setDetailId(p.id)} className="btn-ghost !px-3 !py-1.5 text-xs">
                    {t(locale, "coach.programs.view")}
                  </button>
                  <button onClick={() => openEdit(p.id)} className="btn-ghost !px-3 !py-1.5 text-xs">
                    {t(locale, "coach.programs.edit")}
                  </button>
                  <button onClick={() => duplicate(p.id)} className="btn-ghost !px-3 !py-1.5 text-xs">
                    {t(locale, "coach.programs.duplicate")}
                  </button>
                  {p.status === "ARCHIVED" ? (
                    <button
                      onClick={() => setPendingAction({ id: p.id, name: p.name, kind: "restore" })}
                      className="btn-ghost !px-3 !py-1.5 text-xs"
                    >
                      {t(locale, "coach.programs.restore")}
                    </button>
                  ) : (
                    <button
                      onClick={() => setPendingAction({ id: p.id, name: p.name, kind: "archive" })}
                      className="btn-ghost !px-3 !py-1.5 text-xs"
                    >
                      {t(locale, "coach.programs.archive")}
                    </button>
                  )}
                  <button
                    onClick={() => setPendingAction({ id: p.id, name: p.name, kind: "delete" })}
                    className="btn-ghost !px-3 !py-1.5 text-xs text-red-glow"
                  >
                    {t(locale, "coach.programs.delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {formModal && (
        <ProgramFormModal
          locale={locale}
          mode={formModal.mode}
          initial={{ id: formModal.id, values: formModal.values }}
          onClose={() => setFormModal(null)}
          onSaved={() => {
            setFormModal(null);
            load();
          }}
        />
      )}

      {detailId && (
        <ProgramDetailModal id={detailId} locale={locale} onClose={() => setDetailId(null)} onChanged={load} />
      )}

      <ConfirmModal
        open={pendingAction !== null}
        title={
          pendingAction?.kind === "delete"
            ? t(locale, "coach.programs.confirmDeleteTitle")
            : pendingAction?.kind === "archive"
              ? t(locale, "coach.programs.confirmArchiveTitle")
              : t(locale, "coach.programs.confirmRestoreTitle")
        }
        description={
          pendingAction?.kind === "delete"
            ? t(locale, "coach.programs.confirmDeleteBody", { name: pendingAction.name })
            : pendingAction?.kind === "archive"
              ? t(locale, "coach.programs.confirmArchiveBody", { name: pendingAction?.name ?? "" })
              : t(locale, "coach.programs.confirmRestoreBody", { name: pendingAction?.name ?? "" })
        }
        confirmLabel={
          pendingAction?.kind === "delete"
            ? t(locale, "coach.programs.delete")
            : pendingAction?.kind === "archive"
              ? t(locale, "coach.programs.archive")
              : t(locale, "coach.programs.restore")
        }
        danger={pendingAction?.kind === "delete"}
        busy={busyAction}
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />
    </>
  );
}
