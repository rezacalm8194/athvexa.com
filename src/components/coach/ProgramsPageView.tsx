"use client";

import { useCallback, useEffect, useState } from "react";
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

const FILTER_OPTIONS: { value: "all" | ProgramStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "ARCHIVED", label: "Archived" },
];

export default function ProgramsPageView() {
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
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  function openCreate() {
    setFormModal({ mode: "create", values: emptyProgramForm() });
  }

  async function openEdit(id: string) {
    const res = await fetch(`/api/coach/programs/${id}`);
    if (!res.ok) {
      showToast("Could not load this program", "error");
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
      showToast("Program duplicated", "success");
      load();
    } else {
      showToast("Could not duplicate the program", "error");
    }
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;
    setBusyAction(true);

    if (pendingAction.kind === "delete") {
      const res = await fetch(`/api/coach/programs/${pendingAction.id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Program deleted", "success");
        load();
      } else {
        showToast("Could not delete the program", "error");
      }
    } else {
      const action = pendingAction.kind; // "archive" | "restore"
      const res = await fetch(`/api/coach/programs/${pendingAction.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        showToast(action === "archive" ? "Program archived" : "Program restored", "success");
        load();
      } else {
        showToast("Could not update the program", "error");
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
            <KpiCard label="Active programs" value={kpis?.active ?? 0} icon={CheckCircleIcon} />
            <KpiCard label="Drafts" value={kpis?.draft ?? 0} icon={ClipboardListIcon} />
            <KpiCard label="Archived" value={kpis?.archived ?? 0} icon={AlertIcon} tone={kpis && kpis.archived > 0 ? "warn" : "neutral"} />
            <KpiCard label="Players with a program" value={kpis?.assignedPlayers ?? 0} icon={UsersIcon} />
          </>
        )}
      </div>

      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <SearchInput value={query} onChange={setQuery} placeholder="Search programs…" className="max-w-xs" />
            <StatusFilter value={status} onChange={setStatus} options={FILTER_OPTIONS} />
          </div>
          <button onClick={openCreate} className="btn-primary !px-4 !py-2.5 text-sm">
            <PlusIcon className="mr-1.5 h-4 w-4" />
            New program
          </button>
        </div>

        {programs === null && !error && <SkeletonRows count={4} height="h-[86px]" />}

        {error && <ErrorState message="Could not load your training programs." onRetry={load} />}

        {trueEmpty && (
          <EmptyState
            icon={ClipboardListIcon}
            title="No training programs yet"
            description="Build a structured program with sessions and a duration, then assign it to your players — you can start from a draft and refine it before publishing."
            action={
              <button onClick={openCreate} className="btn-primary !px-5 !py-3 text-sm">
                <PlusIcon className="mr-1.5 h-4 w-4" />
                Create your first program
              </button>
            }
          />
        )}

        {noResultsFromFilter && (
          <p className="py-10 text-center text-sm text-smoke-3">No programs match your search or filter.</p>
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
                    <StatusBadge label={p.status} tone={STATUS_TONE[p.status]} />
                  </div>
                  <div className="mt-0.5 truncate text-xs text-smoke-3">
                    {p.goal ? `${p.goal} · ` : ""}
                    {p.durationWeeks}w · {p.sessionsPerWeek}/wk · {p.assignedCount} player{p.assignedCount === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <button onClick={() => setDetailId(p.id)} className="btn-ghost !px-3 !py-1.5 text-xs">
                    View
                  </button>
                  <button onClick={() => openEdit(p.id)} className="btn-ghost !px-3 !py-1.5 text-xs">
                    Edit
                  </button>
                  <button onClick={() => duplicate(p.id)} className="btn-ghost !px-3 !py-1.5 text-xs">
                    Duplicate
                  </button>
                  {p.status === "ARCHIVED" ? (
                    <button
                      onClick={() => setPendingAction({ id: p.id, name: p.name, kind: "restore" })}
                      className="btn-ghost !px-3 !py-1.5 text-xs"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={() => setPendingAction({ id: p.id, name: p.name, kind: "archive" })}
                      className="btn-ghost !px-3 !py-1.5 text-xs"
                    >
                      Archive
                    </button>
                  )}
                  <button
                    onClick={() => setPendingAction({ id: p.id, name: p.name, kind: "delete" })}
                    className="btn-ghost !px-3 !py-1.5 text-xs text-red-glow"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {formModal && (
        <ProgramFormModal
          mode={formModal.mode}
          initial={{ id: formModal.id, values: formModal.values }}
          onClose={() => setFormModal(null)}
          onSaved={() => {
            setFormModal(null);
            load();
          }}
        />
      )}

      {detailId && <ProgramDetailModal id={detailId} onClose={() => setDetailId(null)} />}

      <ConfirmModal
        open={pendingAction !== null}
        title={
          pendingAction?.kind === "delete"
            ? "Delete this program?"
            : pendingAction?.kind === "archive"
              ? "Archive this program?"
              : "Restore this program?"
        }
        description={
          pendingAction?.kind === "delete"
            ? `"${pendingAction.name}" and its sessions will be permanently deleted. This can't be undone.`
            : pendingAction?.kind === "archive"
              ? `"${pendingAction?.name}" will move to Archived and stay hidden from players' active plans.`
              : `"${pendingAction?.name}" will move back to Draft.`
        }
        confirmLabel={
          pendingAction?.kind === "delete" ? "Delete" : pendingAction?.kind === "archive" ? "Archive" : "Restore"
        }
        danger={pendingAction?.kind === "delete"}
        busy={busyAction}
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />
    </>
  );
}
