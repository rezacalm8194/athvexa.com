import { UsersIcon } from "@/components/icons";

export default function EmptyRosterState({ teamName }: { teamName: string | null }) {
  return (
    <div className="card flex flex-col items-center gap-4 px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red/10 text-red">
        <UsersIcon className="h-7 w-7" />
      </div>
      <div className="max-w-md">
        <h2 className="font-display text-xl font-bold tracking-wide text-white">
          Build {teamName ?? "your team"}&apos;s roster
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-smoke-3">
          Once a player joins, they check in daily with readiness, sleep and soreness data — so you can
          spot fatigue before it becomes an injury and see who&apos;s ready to push harder.
        </p>
      </div>
      <a href="#invite-panel" className="btn-primary !px-5 !py-3 text-sm">
        Invite your first player
      </a>
    </div>
  );
}
