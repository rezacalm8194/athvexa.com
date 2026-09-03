import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ServerDashboardNav from "@/components/ServerDashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import PlayerAssessmentsSection from "@/components/coach/assessments/PlayerAssessmentsSection";
import StatusBadge from "@/components/coach/shared/StatusBadge";
import { CalendarIcon, CheckCircleIcon, ClipboardCheckIcon, ClipboardListIcon } from "@/components/icons";
import { db, ensureDatabase } from "@/lib/db";
import { formatScore } from "@/lib/formatScore";
import { t, type Locale } from "@/lib/i18n";
import { getSession } from "@/lib/session";
import { ensureLegacyTeamMemberships, teamRoleLabel } from "@/lib/teamContext";
import { getUserPreferences } from "@/lib/userPreferences";

type Tone = "good" | "warn" | "bad" | "neutral";

const COACH_TEAM_ROLES = ["OWNER", "HEAD_COACH", "ASSISTANT_COACH", "ANALYST", "PHYSIO"];

function formatDate(value: string | Date | null | undefined, locale: Locale) {
  if (!value) return t(locale, "common.notSet");
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatMetric(value: number | string | null | undefined, fallback: string) {
  return value == null || value === "" ? fallback : String(value);
}

function readinessTone(score: number | null): Tone {
  if (score == null) return "neutral";
  if (score >= 60) return "good";
  if (score >= 40) return "warn";
  return "bad";
}

function readinessLabel(score: number | null, locale: Locale) {
  if (score == null) return t(locale, "coach.playerProfile.noCheckIn");
  if (score >= 80) return t(locale, "coach.playerProfile.readinessExcellent");
  if (score >= 60) return t(locale, "coach.playerProfile.readinessReady");
  if (score >= 40) return t(locale, "coach.playerProfile.readinessFatigued");
  return t(locale, "coach.playerProfile.readinessAttention");
}

function programProgress(program: {
  sessions: { progress: { status: string }[] }[];
}) {
  const total = program.sessions.length;
  if (total === 0) return { completed: 0, total, percent: 0 };
  const completed = program.sessions.filter((session) => session.progress[0]?.status === "COMPLETED").length;
  return { completed, total, percent: Math.round((completed / total) * 100) };
}

function statusForPlayer(role: string, locale: Locale): { label: string; tone: Tone } {
  if (role !== "PLAYER") return { label: t(locale, "coach.playerProfile.statusInactive"), tone: "neutral" };
  return { label: t(locale, "coach.playerProfile.statusActive"), tone: "good" };
}

function programStatusLabel(status: string, locale: Locale) {
  if (status === "ACTIVE") return t(locale, "coach.playerProfile.programActive");
  if (status === "DRAFT") return t(locale, "coach.playerProfile.programDraft");
  if (status === "ARCHIVED") return t(locale, "coach.playerProfile.programArchived");
  return status;
}

export default async function PlayerProfilePage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "PLAYER") redirect("/dashboard/player");

  await ensureDatabase();
  await ensureLegacyTeamMemberships(session.sub);
  await ensureLegacyTeamMemberships(playerId);

  const membership = await db.teamMember.findFirst({
    where: {
      userId: playerId,
      role: "PLAYER",
      team: {
        members: {
          some: {
            userId: session.sub,
            role: { in: COACH_TEAM_ROLES },
          },
        },
      },
    },
    include: { team: true },
  });

  if (!membership) notFound();

  const { locale } = await getUserPreferences(session.sub);

  const player = await db.user.findFirst({
    where: { id: playerId, role: "PLAYER" },
    include: {
      dailyLogs: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 30,
        include: {
          tasks: { orderBy: { order: "asc" } },
        },
      },
      assessmentsReceived: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      },
      programAssignments: {
        include: {
          program: {
            include: {
              sessions: {
                orderBy: { order: "asc" },
                include: {
                  progress: {
                    where: { playerId: playerId },
                  },
                },
              },
            },
          },
        },
        orderBy: { assignedAt: "desc" },
      },
      sessionProgress: {
        include: {
          session: {
            include: {
              program: { select: { id: true, name: true, status: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      },
      coachNotes: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 25,
      },
    },
  });

  if (!player) notFound();

  const latestLog = player.dailyLogs[0] ?? null;
  const latestAssessment = player.assessmentsReceived[0] ?? null;
  const activeAssignment = player.programAssignments.find((assignment) => assignment.program.status === "ACTIVE") ?? null;
  const previousAssignments = player.programAssignments.filter((assignment) => assignment.program.status !== "ACTIVE");
  const activeProgress = activeAssignment ? programProgress(activeAssignment.program) : null;
  const status = statusForPlayer(player.role, locale);
  const initials = player.name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const completedSessions = player.sessionProgress.filter((progress) => progress.status === "COMPLETED");
  const skippedSessions = player.sessionProgress.filter((progress) => progress.status === "SKIPPED");
  const progressedSessionIds = new Set(player.sessionProgress.map((progress) => progress.programSessionId));
  const upcomingSessions =
    activeAssignment?.program.sessions.filter((programSession) => !progressedSessionIds.has(programSession.id)) ?? [];

  const noData = t(locale, "coach.playerProfile.noData");
  const notSet = t(locale, "coach.playerProfile.notSet");

  const tabs = [
    { id: "overview", label: t(locale, "coach.playerProfile.tabOverview") },
    { id: "assessments", label: t(locale, "coach.playerProfile.tabAssessments") },
    { id: "programs", label: t(locale, "coach.playerProfile.tabPrograms") },
    { id: "checkins", label: t(locale, "coach.playerProfile.tabCheckIns") },
    { id: "sessions", label: t(locale, "coach.playerProfile.tabSessions") },
    { id: "notes", label: t(locale, "coach.playerProfile.tabNotes") },
  ];

  return (
    <main className="min-h-screen bg-ink">
      <ServerDashboardNav name={session.name} locale={locale} settingsHref="/dashboard/coach/settings" />
      <CoachNav locale={locale} />
      <section className="mx-auto max-w-[1280px] px-6 py-8">
        <div className="mb-5">
          <Link href="/dashboard/coach/players" className="text-xs font-semibold text-smoke-3 transition-colors hover:text-white">
            {t(locale, "coach.playerProfile.back")}
          </Link>
        </div>

        <header className="card p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-red/15 font-display text-2xl font-black text-red">
                {initials || "P"}
              </div>
              <div>
                <div className="eyebrow">{membership.team.name}</div>
                <h1 className="mt-1 font-display text-4xl font-extrabold tracking-wide text-white">{player.name}</h1>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-smoke-3">
                  <InfoPill label={t(locale, "coach.playerProfile.age")} value={notSet} />
                  <InfoPill label={t(locale, "coach.playerProfile.position")} value={notSet} />
                  <InfoPill label={t(locale, "coach.playerProfile.jersey")} value={notSet} />
                  <InfoPill label={t(locale, "coach.playerProfile.team")} value={membership.team.name} />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={status.label} tone={status.tone} />
              <span className="rounded bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-smoke-3">
                {teamRoleLabel(membership.role)}
              </span>
            </div>
          </div>
        </header>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={CheckCircleIcon}
            label={t(locale, "coach.playerProfile.latestReadiness")}
            value={latestLog ? `${latestLog.score}/100` : noData}
            detail={readinessLabel(latestLog?.score ?? null, locale)}
          />
          <StatCard
            icon={ClipboardCheckIcon}
            label={t(locale, "coach.playerProfile.latestAssessment")}
            value={latestAssessment ? formatScore(latestAssessment.score) : noData}
            detail={latestAssessment ? latestAssessment.type : t(locale, "coach.playerProfile.noAssessments")}
          />
          <StatCard
            icon={ClipboardListIcon}
            label={t(locale, "coach.playerProfile.activeProgram")}
            value={activeAssignment?.program.name ?? t(locale, "coach.playerProfile.noActiveProgram")}
            detail={
              activeProgress
                ? t(locale, "coach.playerProfile.percentComplete", { percent: activeProgress.percent })
                : t(locale, "coach.playerProfile.notAssigned")
            }
          />
          <StatCard
            icon={CalendarIcon}
            label={t(locale, "coach.playerProfile.lastCheckIn")}
            value={latestLog ? formatDate(latestLog.date, locale) : noData}
            detail={latestLog ? readinessLabel(latestLog.score, locale) : t(locale, "coach.playerProfile.noCheckIns")}
          />
        </div>

        <nav className="mt-5 flex gap-1 overflow-x-auto border-b border-white/5">
          {tabs.map((tab) => (
            <a key={tab.id} href={`#${tab.id}`} className="shrink-0 px-3.5 py-3 text-sm font-semibold text-smoke-3 transition-colors hover:text-white">
              {tab.label}
            </a>
          ))}
        </nav>

        <div className="mt-6 grid grid-cols-1 gap-6">
          <Section id="overview" title={t(locale, "coach.playerProfile.overview")}>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
              <InfoCard
                title={t(locale, "coach.playerProfile.basicInfo")}
                rows={[
                  [t(locale, "coach.playerProfile.name"), player.name],
                  [t(locale, "coach.playerProfile.age"), notSet],
                  [t(locale, "coach.playerProfile.position"), notSet],
                  [t(locale, "coach.playerProfile.jerseyNumber"), notSet],
                  [t(locale, "coach.playerProfile.status"), status.label],
                ]}
              />
              <InfoCard
                title={t(locale, "coach.playerProfile.contactInfo")}
                rows={[
                  [t(locale, "coach.playerProfile.email"), formatMetric(player.email, notSet)],
                  [t(locale, "coach.playerProfile.phone"), formatMetric(player.phone, notSet)],
                  [t(locale, "coach.playerProfile.address"), notSet],
                ]}
              />
              <InfoCard
                title={t(locale, "coach.playerProfile.emergencyContact")}
                rows={[
                  [t(locale, "coach.playerProfile.name"), notSet],
                  [t(locale, "coach.playerProfile.relationship"), notSet],
                  [t(locale, "coach.playerProfile.phone"), notSet],
                ]}
              />
              <InfoCard
                title={t(locale, "coach.playerProfile.joinDate")}
                rows={[
                  [t(locale, "coach.playerProfile.joined"), formatDate(membership.createdAt, locale)],
                  [t(locale, "coach.playerProfile.team"), membership.team.name],
                ]}
              />
            </div>
          </Section>

          <Section id="assessments" title={t(locale, "coach.playerProfile.assessments")}>
            <PlayerAssessmentsSection player={{ id: player.id, name: player.name, email: player.email ?? "" }} locale={locale} />
          </Section>

          <Section id="programs" title={t(locale, "coach.playerProfile.programs")}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-white/5 bg-ink-2 p-4">
                <h3 className="font-display text-lg font-bold text-white">{t(locale, "coach.playerProfile.currentProgram")}</h3>
                {activeAssignment ? (
                  <ProgramBlock assignment={activeAssignment} locale={locale} />
                ) : (
                  <EmptyLine text={t(locale, "coach.playerProfile.noActiveAssigned")} />
                )}
              </div>
              <div className="rounded-lg border border-white/5 bg-ink-2 p-4">
                <h3 className="font-display text-lg font-bold text-white">{t(locale, "coach.playerProfile.previousPrograms")}</h3>
                {previousAssignments.length === 0 ? (
                  <EmptyLine text={t(locale, "coach.playerProfile.noPreviousPrograms")} />
                ) : (
                  <div className="mt-3 space-y-3">
                    {previousAssignments.map((assignment) => (
                      <ProgramBlock key={assignment.id} assignment={assignment} locale={locale} compact />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>

          <Section id="checkins" title={t(locale, "coach.playerProfile.checkIns")}>
            {player.dailyLogs.length === 0 ? (
              <EmptyLine text={t(locale, "coach.playerProfile.noDailyCheckIns")} />
            ) : (
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {player.dailyLogs.map((log) => (
                  <div key={log.id} className="rounded-lg border border-white/5 bg-ink-2 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-white">{formatDate(log.date, locale)}</div>
                      <StatusBadge label={readinessLabel(log.score, locale)} tone={readinessTone(log.score)} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <MiniMetric label={t(locale, "coach.playerProfile.readiness")} value={`${log.score}/100`} />
                      <MiniMetric label={t(locale, "coach.playerProfile.sleep")} value={log.sleepHours == null ? noData : `${log.sleepHours}h`} />
                      <MiniMetric label={t(locale, "coach.playerProfile.water")} value={log.waterLiters == null ? noData : `${log.waterLiters} L`} />
                      <MiniMetric label={t(locale, "coach.playerProfile.energy")} value={log.energy == null ? noData : `${log.energy}/5`} />
                      <MiniMetric label={t(locale, "coach.playerProfile.fatigue")} value={log.fatigue == null ? noData : `${log.fatigue}/5`} />
                      <MiniMetric label={t(locale, "coach.playerProfile.soreness")} value={log.soreness == null ? noData : `${log.soreness}/5`} />
                      <MiniMetric label={t(locale, "coach.playerProfile.mood")} value={log.mood == null ? noData : `${log.mood}/5`} />
                      <MiniMetric label={t(locale, "coach.playerProfile.stress")} value={log.stress == null ? noData : `${log.stress}/5`} />
                      <MiniMetric label={t(locale, "coach.playerProfile.sleepQuality")} value={log.sleepQuality == null ? noData : `${log.sleepQuality}/5`} />
                      <MiniMetric label={t(locale, "coach.playerProfile.bodyWeight")} value={log.bodyWeight == null ? noData : `${log.bodyWeight} kg`} />
                    </div>
                    <div className="mt-4 border-t border-white/5 pt-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-smoke-3">{t(locale, "coach.playerProfile.notes")}</h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-smoke-2">{formatMetric(log.notes, t(locale, "coach.playerProfile.noNotes"))}</p>
                    </div>
                    <div className="mt-4 border-t border-white/5 pt-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-smoke-3">{t(locale, "coach.playerProfile.tasks")}</h3>
                      {log.tasks.length === 0 ? (
                        <p className="mt-2 text-sm text-smoke-3">{t(locale, "coach.playerProfile.noTasks")}</p>
                      ) : (
                        <ul className="mt-2 space-y-2">
                          {log.tasks.map((task) => (
                            <li key={task.id} className="flex items-start gap-2 rounded-md bg-ink-3 px-3 py-2 text-sm">
                              <span
                                aria-hidden="true"
                                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                                  task.done ? "border-red bg-red text-white" : "border-smoke-4 text-transparent"
                                }`}
                              >
                                ✓
                              </span>
                              <span className="min-w-0 flex-1 text-smoke-2">{task.label}</span>
                              <span className="shrink-0 text-xs font-semibold text-smoke-4">
                                {task.done ? t(locale, "coach.playerProfile.done") : t(locale, "coach.playerProfile.notDone")}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section id="sessions" title={t(locale, "coach.playerProfile.sessions")}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <SessionColumn
                title={t(locale, "coach.playerProfile.completed")}
                emptyText={t(locale, "coach.playerProfile.noSessions")}
                items={completedSessions.map((item) => `${item.session.title} - ${item.session.program.name}`)}
              />
              <SessionColumn
                title={t(locale, "coach.playerProfile.skipped")}
                emptyText={t(locale, "coach.playerProfile.noSessions")}
                items={skippedSessions.map((item) => `${item.session.title} - ${item.session.program.name}`)}
              />
              <SessionColumn
                title={t(locale, "coach.playerProfile.upcoming")}
                emptyText={t(locale, "coach.playerProfile.noSessions")}
                items={upcomingSessions.map((item) => `${item.title} - ${activeAssignment?.program.name}`)}
              />
            </div>
          </Section>

          <Section id="notes" title={t(locale, "coach.playerProfile.coachNotes")}>
            {player.coachNotes.length === 0 ? (
              <EmptyLine text={t(locale, "coach.playerProfile.noCoachNotes")} />
            ) : (
              <div className="space-y-3">
                {player.coachNotes.map((note) => (
                  <article key={note.id} className="rounded-lg border border-white/5 bg-ink-2 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-smoke-3">{formatDate(note.date, locale)}</div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-smoke-2">{note.message}</p>
                  </article>
                ))}
              </div>
            )}
          </Section>
        </div>
      </section>
    </main>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-md border border-line-1 bg-ink-2 px-2.5 py-1">
      <span className="text-smoke-4">{label}: </span>
      <span className="font-semibold text-white">{value}</span>
    </span>
  );
}

function StatCard({ icon: Icon, label, value, detail }: { icon: (props: { className?: string }) => JSX.Element; label: string; value: string; detail: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red/10 text-red">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold uppercase tracking-wide text-smoke-3">{label}</div>
          <div className="mt-1 truncate font-display text-xl font-black text-white">{value}</div>
          <div className="mt-0.5 truncate text-xs text-smoke-4">{detail}</div>
        </div>
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-28 p-5">
      <h2 className="mb-4 font-display text-2xl font-bold text-white">{title}</h2>
      {children}
    </section>
  );
}

function InfoCard({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-lg border border-white/5 bg-ink-2 p-4">
      <h3 className="font-display text-lg font-bold text-white">{title}</h3>
      <dl className="mt-3 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 text-sm">
            <dt className="text-smoke-3">{label}</dt>
            <dd className="text-right font-semibold text-white">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="mt-3 rounded-md border border-dashed border-line-1 px-4 py-6 text-center text-sm text-smoke-3">{text}</p>;
}

function ProgramBlock({
  assignment,
  locale,
  compact = false,
}: {
  assignment: {
    assignedAt: Date;
    program: {
      name: string;
      status: string;
      goal: string | null;
      sessions: { progress: { status: string }[] }[];
    };
  };
  locale: Locale;
  compact?: boolean;
}) {
  const progress = programProgress(assignment.program);
  return (
    <div className={compact ? "rounded-md border border-white/5 bg-ink-3 p-3" : "mt-3"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-white">{assignment.program.name}</div>
          <div className="mt-1 text-xs text-smoke-3">{assignment.program.goal ?? t(locale, "coach.playerProfile.noGoal")}</div>
        </div>
        <StatusBadge
          label={programStatusLabel(assignment.program.status, locale)}
          tone={assignment.program.status === "ACTIVE" ? "good" : "neutral"}
        />
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-red" style={{ width: `${progress.percent}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-smoke-3">
        <span>{t(locale, "coach.playerProfile.progressPct", { percent: progress.percent })}</span>
        <span>{t(locale, "coach.playerProfile.assignedOn", { date: formatDate(assignment.assignedAt, locale) })}</span>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-ink-3 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-smoke-4">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function SessionColumn({ title, emptyText, items }: { title: string; emptyText: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-white/5 bg-ink-2 p-4">
      <h3 className="font-display text-lg font-bold text-white">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-smoke-3">{emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item} className="rounded-md bg-ink-3 px-3 py-2 text-sm text-smoke-2">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
