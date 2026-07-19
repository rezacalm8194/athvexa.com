export default function ScoreCard({ score, delta }: { score: number; delta?: number }) {
  return (
    <div className="rounded-lg bg-red p-5 text-white">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] opacity-75">
        Daily score
      </div>
      <div className="font-display text-[48px] font-black leading-none">{score}</div>
      {typeof delta === "number" && (
        <div className="text-xs opacity-75">
          {delta >= 0 ? "+" : ""}
          {delta} pts vs yesterday
        </div>
      )}
    </div>
  );
}
