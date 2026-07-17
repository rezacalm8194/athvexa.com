import Link from "next/link";

const checklist = [
  {
    title: "Complete profile",
    status: "Ready",
    body: "Name, language, calendar, timezone, and hour format defaults are collected."
  },
  {
    title: "Create team",
    status: "Next",
    body: "Team persistence and management arrive with the teams module stage."
  },
  {
    title: "Add player",
    status: "Planned",
    body: "Player invitations stay locked until player and team foundations are implemented."
  },
  {
    title: "Create training",
    status: "Planned",
    body: "Training builder screens are intentionally outside this onboarding stage."
  },
  {
    title: "Assign habit",
    status: "Planned",
    body: "Habit workflows will use the later habit and goal modules."
  },
  {
    title: "Create goal",
    status: "Planned",
    body: "Goal tracking remains visible here as an early next action."
  }
];

export default function CoachPage() {
  return (
    <main className="coach-shell" data-theme="dark">
      <header className="coach-header">
        <div>
          <p className="ui-eyebrow">Coach Dashboard</p>
          <h1>Workspace entry is ready.</h1>
        </div>
        <p>
          This is the local post-onboarding destination. The complete dashboard, reports, and player
          modules are still reserved for their dedicated roadmap stages.
        </p>
        <div className="coach-header__actions">
          <Link className="ui-button ui-button--primary" href="/coach/invitations">
            Invitations
          </Link>
          <Link className="ui-button ui-button--secondary" href="/coach/members">
            Members
          </Link>
          <Link className="ui-button ui-button--secondary" href="/onboarding">
            Edit onboarding
          </Link>
          <Link className="ui-button ui-button--secondary" href="/ui-preview">
            UI preview
          </Link>
        </div>
      </header>

      <section className="coach-grid" aria-label="Coach onboarding status">
        {checklist.map((item) => (
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
