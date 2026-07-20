export function SkeletonRows({ count = 4, height = "h-14" }: { count?: number; height?: string }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${height} animate-pulse rounded-md bg-white/5`} />
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-[76px] animate-pulse rounded-lg bg-white/5" />
      ))}
    </div>
  );
}
