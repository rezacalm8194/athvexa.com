import Link from "next/link";
import {
  onboardingStepIds,
  supportedActivityTypes,
  supportedOnboardingCalendars,
  supportedOnboardingHourFormats,
  supportedOnboardingLocales
} from "@fpp/validation";

const activityLabels: Record<(typeof supportedActivityTypes)[number], string> = {
  individual_coach: "Individual coach",
  academy: "Academy",
  club: "Club",
  private_group: "Private group",
  school: "School",
  other: "Other"
};

const startChecklist = [
  "Complete profile",
  "Create team",
  "Add player",
  "Create training",
  "Assign habit",
  "Create goal"
];

export default function OnboardingPage() {
  return (
    <main className="onboarding-page" data-theme="dark">
      <form action="/coach" className="onboarding-shell" method="get">
        <header className="onboarding-hero">
          <div>
            <p className="ui-eyebrow">Workspace onboarding</p>
            <h1>Set up the coaching space.</h1>
          </div>
          <p>
            Capture the minimum defaults needed after signup. Optional steps can be skipped now and
            finished from the Coach Dashboard later.
          </p>
          <div className="onboarding-hero__actions">
            <button className="ui-button ui-button--primary" type="submit">
              Enter Coach Dashboard
            </button>
            <Link className="ui-button ui-button--secondary" href="/sessions">
              Review sessions
            </Link>
          </div>
        </header>

        <section className="onboarding-layout">
          <div className="onboarding-steps" aria-label="Onboarding steps">
            <article className="onboarding-step">
              <StepHeader index={1} required title="Workspace name" />
              <p>This name appears in navigation, invitations, reports, and audit records.</p>
              <label className="ui-field">
                <span className="ui-field__label">Workspace name</span>
                <input
                  className="ui-input"
                  defaultValue="My Football Workspace"
                  maxLength={160}
                  minLength={2}
                  name="workspaceName"
                  required
                />
              </label>
            </article>

            <article className="onboarding-step">
              <StepHeader index={2} title="Country" />
              <p>Use a two-letter country code for now. The full country selector lands later.</p>
              <label className="ui-field">
                <span className="ui-field__label">Country code</span>
                <input className="ui-input" maxLength={2} name="country" placeholder="IR" />
              </label>
              <SkipToggle stepId="country" />
            </article>

            <article className="onboarding-step">
              <StepHeader index={3} required title="Timezone" />
              <p>Defaults to Tehran for local development; this will come from profile/location later.</p>
              <label className="ui-field">
                <span className="ui-field__label">Timezone</span>
                <select className="ui-input ui-select" defaultValue="Asia/Tehran" name="timezone" required>
                  <option value="Asia/Tehran">Asia/Tehran</option>
                  <option value="UTC">UTC</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Europe/Madrid">Europe/Madrid</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Asia/Dubai">Asia/Dubai</option>
                </select>
              </label>
            </article>

            <article className="onboarding-step">
              <StepHeader index={4} required title="Language" />
              <div className="onboarding-options" role="group" aria-label="Language">
                {supportedOnboardingLocales.map((locale) => (
                  <label className="onboarding-choice" key={locale}>
                    <input defaultChecked={locale === "en"} name="locale" type="radio" value={locale} />
                    <span>{locale.toUpperCase()}</span>
                  </label>
                ))}
              </div>
            </article>

            <article className="onboarding-step">
              <StepHeader index={5} required title="Calendar" />
              <div className="onboarding-options" role="group" aria-label="Calendar">
                {supportedOnboardingCalendars.map((calendar) => (
                  <label className="onboarding-choice" key={calendar}>
                    <input
                      defaultChecked={calendar === "gregorian"}
                      name="calendar"
                      type="radio"
                      value={calendar}
                    />
                    <span>{calendar}</span>
                  </label>
                ))}
              </div>
            </article>

            <article className="onboarding-step">
              <StepHeader index={6} required title="Hour format" />
              <div className="onboarding-options" role="group" aria-label="Hour format">
                {supportedOnboardingHourFormats.map((hourFormat) => (
                  <label className="onboarding-choice" key={hourFormat}>
                    <input
                      defaultChecked={hourFormat === "24"}
                      name="hourFormat"
                      type="radio"
                      value={hourFormat}
                    />
                    <span>{hourFormat}-hour</span>
                  </label>
                ))}
              </div>
            </article>

            <article className="onboarding-step">
              <StepHeader index={7} required title="Coaching activity" />
              <label className="ui-field">
                <span className="ui-field__label">Activity type</span>
                <select className="ui-input ui-select" defaultValue="academy" name="activityType" required>
                  {supportedActivityTypes.map((activityType) => (
                    <option key={activityType} value={activityType}>
                      {activityLabels[activityType]}
                    </option>
                  ))}
                </select>
              </label>
            </article>

            <article className="onboarding-step">
              <StepHeader index={8} title="Approximate players" />
              <label className="ui-field">
                <span className="ui-field__label">Player count</span>
                <input className="ui-input" min={0} name="approxPlayerCount" placeholder="24" type="number" />
              </label>
              <SkipToggle stepId="approxPlayerCount" />
            </article>

            <article className="onboarding-step">
              <StepHeader index={9} title="First team" />
              <label className="ui-field">
                <span className="ui-field__label">Team name</span>
                <input className="ui-input" maxLength={160} name="firstTeamName" placeholder="U17" />
              </label>
              <SkipToggle stepId="firstTeam" />
            </article>
          </div>

          <aside className="onboarding-side" aria-label="Getting started checklist">
            <div>
              <p className="ui-eyebrow">Start checklist</p>
              <h2>First session prep</h2>
            </div>
            <ul>
              {startChecklist.map((item, index) => (
                <li key={item}>
                  <span>{index + 1}</span>
                  {item}
                </li>
              ))}
            </ul>
            <p>
              Items that need product modules stay visible as next actions, but their deeper screens are
              intentionally left for later stages.
            </p>
          </aside>
        </section>

        <footer className="onboarding-footer">
          <div>
            <strong>Ready enough is ready.</strong>
            <span>Skipped steps remain editable from workspace settings later.</span>
          </div>
          <button className="ui-button ui-button--primary" type="submit">
            Enter Coach Dashboard
          </button>
        </footer>
      </form>
    </main>
  );
}

function StepHeader({ index, required, title }: { index: number; required?: boolean; title: string }) {
  return (
    <div className="onboarding-step__header">
      <span>{index}</span>
      <div>
        <h2>{title}</h2>
        <small>{required ? "Required" : "Optional"}</small>
      </div>
    </div>
  );
}

function SkipToggle({ stepId }: { stepId: (typeof onboardingStepIds)[number] }) {
  return (
    <label className="ui-check">
      <input name="skippedSteps" type="checkbox" value={stepId} />
      <span>Skip this for now</span>
    </label>
  );
}
