import type { ComponentType } from "react";

export default function ComingSoonSection({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="mx-auto max-w-[1280px] px-6 py-8">
      <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-smoke-4">
          <Icon className="h-6 w-6" />
        </div>
        <div className="max-w-md">
          <h1 className="font-display text-xl font-bold tracking-wide text-white">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-smoke-3">{description}</p>
        </div>
        <span className="eyebrow rounded-full border border-line-1 px-3 py-1">Coming soon</span>
      </div>
    </div>
  );
}
