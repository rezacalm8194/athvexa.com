import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import StatusBadge from "@/components/coach/shared/StatusBadge";
import { CalendarIcon, CheckCircleIcon, ClipboardCheckIcon, ClipboardListIcon, UsersIcon } from "@/components/icons";
import { db, ensureDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ensureLegacyTeamMemberships, teamRoleLabel } from "@/lib/teamContext";

type Tone = "good" | "warn" | "bad" | "neutral";

const COACH_TEAM_ROLES = ["OWNER", "HEAD_COACH", "ASSISTANT_COACH", "ANALYST", "PHYSIO"];

function formatDate(value?: string | Date | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatMetric(value: number | string | null | undefined, fallback = "No data") {
  return value == null || value === "" ? fallback : String(value);
}

function readinessTone(score: number | null): Tone {
  if (score == null) return "neutral";
  if (score >= 60) return "good";
  if (score >= 40) return "warn";
  return "bad";
}

function readinessLabel(score: number | null) {
  if (score == null) return "No check-in";
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Ready";
  if (score >= 40) return "Fatigued";
  return "Needs attention";
}

function programProgress(program: {
  sessions: { progress: { status: string }[] }[];
}) {
  const total = program.sessions.length;
  if (total === 0) return { completed: 0, total, percent: 0 };
  const completed = program.sessions.filter((session) => session.progress[0]?.status === "COMPLETED").length;
  return { completed, total, percent: Math.round((completed / total) * 100) };
}

function statusForPlayer(role: string): { label: string; tone: Tone } {
  if (role !== "PLAYER") return { label: "Inactive", tone: "neutral" };
  return { label: "Active", tone: "good" };
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
  const status = statusForPlayer(player.role);
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

  const tabs = ["Overview", "Assessments", "Programs", "Check-ins", "Sessions", "Notes"];

  return (
    <main className="min-h-screen bg-ink">
      <DashboardNav name={session.name} roleLabel={session.role === "COACH" ? "Coach" : "Assistant coach"} settingsHref="/dashboard/coach/settings" />
      <CoachNav />
      <section className="mx-auto max-w-[1280px] px-6 py-8">
        <div className="mb-5">
          <Link href="/dashboard/coach/players" className="text-xs font-semibold text-smoke-3 transition-colors hover:text-white">
            Back to players
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
                  <InfoPill label="Age" value="Not set" />
                  <InfoPill label="Position" value="Not set" />
                  <InfoPill label="Jersey" value="Not set" />
                  <InfoPill label="Team" value={membership.team.name} />
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
          <StatCard icon={CheckCircleIcon} label="Latest readiness" value={latestLog ? `${latestLog.score}/100` : "No data"} detail={readinessLabel(latestLog?.score ?? null)} />
          <StatCard icon={ClipboardCheckIcon} label="Latest assessment" value={latestAssessment ? `${latestAssessment.score}/100` : "No data"} detail={latestAssessment ? latestAssessment.type : "No assessments"} />
          <StatCard icon={ClipboardListIcon} label="Active program" value={activeAssignment?.program.name ?? "No active program"} detail={activeProgress ? `${activeProgress.percent}% complete` : "Not assigned"} />
          <StatCard icon={CalendarIcon} label="Last check-in" value={latestLog ? formatDate(latestLog.date) : "No data"} detail={latestLog ? readinessLabel(latestLog.score) : "No check-ins"} />
        </div>

        <nav className="mt-5 flex gap-1 overflow-x-auto border-b border-white/5">
          {tabs.map((tab) => (
            <a key={tab} href={`#${tab.toLowerCase().replace("-", "")}`} className="shrink-0 px-3.5 py-3 text-sm font-semibold text-smoke-3 transition-colors hover:text-white">
              {tab}
            </a>
          ))}
        </nav>

        <div className="mt-6 grid grid-cols-1 gap-6">
          <Section id="overview" title="Overview">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
              <InfoCard title="Basic information" rows={[["Name", player.name], ["Age", "Not set"], ["Position", "Not set"], ["Jersey number", "Not set"], ["Status", status.label]]} />
              <InfoCard title="Contact information" rows={[["Email", player.email ?? "Not set"], ["Phone", player.phone ?? "Not set"], ["Address", "Not set"]]} />
              <InfoCard title="Emergency contact" rows={[["Name", "Not set"], ["Relationship", "Not set"], ["Phone", "Not set"]]} />
              <InfoCard title="Join date" rows={[["Joined", formatDate(membership.createdAt)], ["Team", membership.team.name]]} />
            </div>
          </Section>

          <Section id="assessments" title="Assessments">
            {player.assessmentsReceived.length === 0 ? (
              <EmptyLine text="No assessments recorded yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-smoke-3">
                    <tr className="border-b border-white/5">
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">Score</th>
                      <th className="px-3 py-3">Notes</th>
                      <th className="px-3 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {player.assessmentsReceived.map((assessment) => (
                      <tr key={assessment.id} className="border-b border-white/5">
                        <td className="px-3 py-4 font-semibold text-white">{assessment.type}</td>
                        <td className="px-3 py-4 text-smoke-2">{formatDate(assessment.date)}</td>
                        <td className="px-3 py-4 text-smoke-2">{assessment.score}/100</td>
                        <td className="max-w-sm truncate px-3 py-4 text-smoke-3">{assessment.notes ?? "No notes"}</td>
                        <td className="px-3 py-4 text-right">
                          <Link href={`/dashboard/coach/assessments?assessmentId=${assessment.id}`} className="btn-ghost !px-3 !py-2 text-xs">
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section id="programs" title="Programs">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-white/5 bg-ink-2 p-4">
                <h3 className="font-display text-lg font-bold text-white">Current program</h3>
                {activeAssignment ? (
                  <ProgramBlock assignment={activeAssignment} />
                ) : (
                  <EmptyLine text="No active program assigned." />
                )}
              </div>
              <div className="rounded-lg border border-white/5 bg-ink-2 p-4">
                <h3 className="font-display text-lg font-bold text-white">Previous programs</h3>
                {previousAssignments.length === 0 ? (
                  <EmptyLine text="No previous programs yet." />
                ) : (
                  <div className="mt-3 space-y-3">
                    {previousAssignments.map((assignment) => (
                      <ProgramBlock key={assignment.id} assignment={assignment} compact />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>

          <Section id="checkins" title="Check-ins">
            {player.dailyLogs.length === 0 ? (
              <EmptyLine text="No daily check-ins yet." />
            ) : (
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {player.dailyLogs.map((log) => (
                  <div key={log.id} className="rounded-lg border border-white/5 bg-ink-2 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-white">{formatDate(log.date)}</div>
                      <StatusBadge label={readinessLabel(log.score)} tone={readinessTone(log.score)} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <MiniMetric label="Readiness" value={`${log.score}/100`} />
                      <MiniMetric label="Sleep" value={log.sleepHours == null ? "No data" : `${log.sleepHours}h`} />
                      <MiniMetric label="Water" value={log.waterLiters == null ? "No data" : `${log.waterLiters} L`} />
                      <MiniMetric label="Energy" value={log.energy == null ? "No data" : `${log.energy}/5`} />
                      <MiniMetric label="Fatigue" value={log.fatigue == null ? "No data" : `${log.fatigue}/5`} />
                      <MiniMetric label="Soreness" value={log.soreness == null ? "No data" : `${log.soreness}/5`} />
                      <MiniMetric label="Mood" value={log.mood == null ? "No data" : `${log.mood}/5`} />
                      <MiniMetric label="Stress" value={log.stress == null ? "No data" : `${log.stress}/5`} />
                      <MiniMetric label="Sleep quality" value={log.sleepQuality == null ? "No data" : `${log.sleepQuality}/5`} />
                      <MiniMetric label="Body weight" value={log.bodyWeight == null ? "No data" : `${log.bodyWeight} kg`} />
                    </div>
                    <div className="mt-4 border-t border-white/5 pt-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-smoke-3">Notes</h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-smoke-2">{formatMetric(log.notes, "No notes")}</p>
                    </div>
                    <div className="mt-4 border-t border-white/5 pt-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-smoke-3">Tasks</h3>
                      {log.tasks.length === 0 ? (
                        <p className="mt-2 text-sm text-smoke-3">No tasks for this check-in.</p>
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
                              <span className="shrink-0 text-xs font-semibold text-smoke-4">{task.done ? "Done" : "Not done"}</span>
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

          <Section id="sessions" title="Sessions">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <SessionColumn title="Completed" items={completedSessions.map((item) => `${item.session.title} - ${item.session.program.name}`)} />
              <SessionColumn title="Skipped" items={skippedSessions.map((item) => `${item.session.title} - ${item.session.program.name}`)} />
              <SessionColumn title="Upcoming" items={upcomingSessions.map((item) => `${item.title} - ${activeAssignment?.program.name}`)} />
            </div>
          </Section>

          <Section id="notes" title="Coach notes">
            {player.coachNotes.length === 0 ? (
              <EmptyLine text="No private coach notes yet." />
            ) : (
              <div className="space-y-3">
                {player.coachNotes.map((note) => (
                  <article key={note.id} className="rounded-lg border border-white/5 bg-ink-2 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-smoke-3">{formatDate(note.date)}</div>
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
  compact?: boolean;
}) {
  const progress = programProgress(assignment.program);
  return (
    <div className={compact ? "rounded-md border border-white/5 bg-ink-3 p-3" : "mt-3"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-white">{assignment.program.name}</div>
          <div className="mt-1 text-xs text-smoke-3">{assignment.program.goal ?? "No goal set"}</div>
        </div>
        <StatusBadge label={assignment.program.status} tone={assignment.program.status === "ACTIVE" ? "good" : "neutral"} />
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-red" style={{ width: `${progress.percent}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-smoke-3">
        <span>{progress.percent}% progress</span>
        <span>Assigned {formatDate(assignment.assignedAt)}</span>
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

function SessionColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-white/5 bg-ink-2 p-4">
      <h3 className="font-display text-lg font-bold text-white">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-smoke-3">No sessions.</p>
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
