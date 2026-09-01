"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ConfirmModal from "@/components/coach/shared/ConfirmModal";
import EmptyState from "@/components/coach/shared/EmptyState";
import ErrorState from "@/components/coach/shared/ErrorState";
import { SkeletonRows } from "@/components/coach/shared/LoadingSkeleton";
import {
  AssessmentChangeBadge,
  AssessmentDetailModal,
  AssessmentFormState,
  AssessmentItem,
  AssessmentModal,
  PlayerOption,
  emptyAssessmentForm,
  formatAssessmentDate,
} from "@/components/coach/assessments/AssessmentUi";
import { ClipboardCheckIcon, PlusIcon } from "@/components/icons";
import { useToast } from "@/components/ui/Toast";
import { formatScore } from "@/lib/formatScore";

type AssessmentResponse = {
  assessments: AssessmentItem[];
};

export default function PlayerAssessmentsSection({ player }: { player: PlayerOption }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const deepLinkedAssessmentId = searchParams.get("assessmentId");
  const shouldCreate = searchParams.get("newAssessment") === "1";
  const [data, setData] = useState<AssessmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; item?: AssessmentItem } | null>(null);
  const [viewing, setViewing] = useState<AssessmentItem | null>(null);
  const [deleting, setDeleting] = useState<AssessmentItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [handledQuery, setHandledQuery] = useState<string | null>(null);

  const loadAssessments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/coach/assessments?playerId=${encodeURIComponent(player.id)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load assessments");
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load assessments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAssessments();
  }, [player.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!deepLinkedAssessmentId && !shouldCreate && window.location.hash !== "#assessments") return;
    document.getElementById("assessments")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [deepLinkedAssessmentId, shouldCreate]);

  useEffect(() => {
    if (loading) return;
    const queryKey = deepLinkedAssessmentId ? `view:${deepLinkedAssessmentId}` : shouldCreate ? "create" : null;
    if (!queryKey) {
      if (handledQuery) setHandledQuery(null);
      return;
    }
    if (handledQuery === queryKey) return;

    if (deepLinkedAssessmentId) {
      const assessment = data?.assessments.find((item) => item.id === deepLinkedAssessmentId);
      if (assessment) setViewing(assessment);
      else showToast("Assessment not found for this player.", "error");
    } else if (shouldCreate) {
      setModal({ mode: "create" });
    }
    setHandledQuery(queryKey);
  }, [data?.assessments, deepLinkedAssessmentId, handledQuery, loading, shouldCreate, showToast]);

  const assessments = data?.assessments ?? [];
  const initialForm = useMemo<AssessmentFormState>(() => {
    if (!modal?.item) return emptyAssessmentForm(player.id);
    return {
      playerId: player.id,
      type: modal.item.type,
      date: modal.item.date,
      score: String(modal.item.score),
      notes: modal.item.notes ?? "",
    };
  }, [modal, player.id]);

  const closeQueryModal = () => {
    setViewing(null);
    router.replace(`/dashboard/coach/players/${encodeURIComponent(player.id)}#assessments`, { scroll: false });
  };

  const closeEditor = () => {
    setModal(null);
    if (shouldCreate) {
      router.replace(`/dashboard/coach/players/${encodeURIComponent(player.id)}#assessments`, { scroll: false });
    }
  };

  const saveAssessment = async (form: AssessmentFormState) => {
    const score = Number(form.score);
    if (form.score.trim() === "" || !Number.isFinite(score)) {
      showToast("Enter a valid score.", "error");
      return;
    }

    setBusy(true);
    try {
      const isEditing = modal?.mode === "edit" && modal.item;
      const response = await fetch(isEditing ? `/api/coach/assessments/${modal.item!.id}` : "/api/coach/assessments", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, playerId: player.id, score }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save assessment");
      showToast(isEditing ? "Assessment updated." : "Assessment created.");
      setModal(null);
      router.replace(`/dashboard/coach/players/${encodeURIComponent(player.id)}#assessments`, { scroll: false });
      await loadAssessments();
      router.refresh();
    } catch (saveError) {
      showToast(saveError instanceof Error ? saveError.message : "Could not save assessment", "error");
    } finally {
      setBusy(false);
    }
  };

  const deleteAssessment = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/coach/assessments/${deleting.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not delete assessment");
      showToast("Assessment deleted.");
      setDeleting(null);
      await loadAssessments();
      router.refresh();
    } catch (deleteError) {
      showToast(deleteError instanceof Error ? deleteError.message : "Could not delete assessment", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-smoke-3">Full assessment history for {player.name || player.email}.</p>
        <button className="btn-primary justify-center gap-2 !px-4 !py-3 text-sm" onClick={() => setModal({ mode: "create" })}>
          <PlusIcon className="h-4 w-4" />
          New assessment
        </button>
      </div>

      {loading ? <SkeletonRows count={4} /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={loadAssessments} /> : null}
      {!loading && !error && assessments.length === 0 ? (
        <EmptyState
          icon={ClipboardCheckIcon}
          title="No assessments yet"
          description="Create this player’s first assessment to start tracking development."
          action={
            <button className="btn-primary !px-4 !py-2 text-sm" onClick={() => setModal({ mode: "create" })}>
              New assessment
            </button>
          }
        />
      ) : null}
      {!loading && !error && assessments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-smoke-3">
              <tr className="border-b border-white/5">
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Score</th>
                <th className="px-3 py-3">Previous</th>
                <th className="px-3 py-3">Change</th>
                <th className="px-3 py-3">Notes</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((assessment) => (
                <tr key={assessment.id} className="border-b border-white/5 last:border-b-0">
                  <td className="px-3 py-4 font-semibold text-white">{assessment.type}</td>
                  <td className="px-3 py-4 text-smoke-2">{formatAssessmentDate(assessment.date)}</td>
                  <td className="px-3 py-4 font-semibold text-white">{formatScore(assessment.score)}</td>
                  <td className="px-3 py-4 text-smoke-2">{assessment.previousScore == null ? "-" : formatScore(assessment.previousScore)}</td>
                  <td className="px-3 py-4"><AssessmentChangeBadge value={assessment.change} /></td>
                  <td className="max-w-xs truncate px-3 py-4 text-smoke-3">{assessment.notes?.trim() || "No notes"}</td>
                  <td className="px-3 py-4">
                    <div className="flex justify-end gap-2">
                      <button className="btn-ghost !px-3 !py-2 text-xs" onClick={() => setViewing(assessment)}>View</button>
                      <button className="btn-ghost !px-3 !py-2 text-xs" onClick={() => setModal({ mode: "edit", item: assessment })}>Edit</button>
                      <button className="btn-ghost !px-3 !py-2 text-xs text-red-glow" onClick={() => setDeleting(assessment)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <AssessmentModal
        open={Boolean(modal)}
        mode={modal?.mode ?? "create"}
        players={[player]}
        initial={initialForm}
        busy={busy}
        lockPlayer
        onClose={closeEditor}
        onSubmit={saveAssessment}
      />
      <AssessmentDetailModal assessment={viewing} onClose={deepLinkedAssessmentId ? closeQueryModal : () => setViewing(null)} />
      <ConfirmModal
        open={Boolean(deleting)}
        title="Delete assessment?"
        description="This assessment will be permanently removed from the player record."
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={deleteAssessment}
      />
    </>
  );
}
