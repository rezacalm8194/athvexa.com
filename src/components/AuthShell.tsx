import Link from "next/link";

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-ink px-6 py-16">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(224,32,32,0.14) 0%, transparent 70%)",
        }}
      />
      <div className="relative mx-auto flex max-w-[420px] flex-col items-center">
        <Link
          href="https://athvexa.com"
          className="mb-10 font-display text-3xl font-black tracking-wide text-white"
        >
          ATH<span className="text-red">VEXA</span>
        </Link>

        <div className="w-full card p-8">
          <h1 className="font-display text-2xl font-extrabold tracking-wide text-white">
            {title}
          </h1>
          <p className="mt-1 text-sm text-smoke-4">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
