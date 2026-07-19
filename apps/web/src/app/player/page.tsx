import Link from "next/link";

const nextSteps = [
  {
    title: "Account ready",
    status: "Ready",
    body: "Your invited player account has been created and connected to the workspace."
  },
  {
    title: "Player dashboard",
    status: "Planned",
    body: "Daily training, habits, goals, and reports will arrive with the player module stage."
  },
  {
    title: "Coach access",
    status: "Active",
    body: "Your coach can manage your workspace access and future player assignments."
  }
];

export default function PlayerPage() {
  return (
    <main className="coach-shell" data-theme="dark">
      <header className="coach-header">
        <div>
          <p className="ui-eyebrow">Player Entry</p>
          <h1>Your player account is ready.</h1>
        </div>
        <p>
          This is the player post-invitation destination. Player-specific modules are reserved for
          the next roadmap stage, so this page confirms access without showing coach controls.
        </p>
        <div className="coach-header__actions">
          <Link className="ui-button ui-button--secondary" href="/sessions">
            Sessions
          </Link>
        </div>
      </header>

      <section className="coach-grid" aria-label="Player onboarding status">
        {nextSteps.map((item) => (
          <article className="coach-card" key={item.title}>
            <div className="coach-card__top">
              <h2>{item.title}</h2>
              <span className="ui-badge" data-tone={item.status === "Ready" ? "success" : "info"}>
                {item.status}
              </span>
            </div>
            <p>{item.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
