import type { ReactNode } from "react";

export default function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="font-display text-3xl font-extrabold tracking-wide text-white">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-smoke-3">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
