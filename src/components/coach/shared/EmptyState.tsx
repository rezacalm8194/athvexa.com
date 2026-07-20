import type { ComponentType } from "react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-1 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-smoke-4">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h3 className="font-display text-base font-bold text-white">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-smoke-3">{description}</p>
      </div>
      {action}
    </div>
  );
}
