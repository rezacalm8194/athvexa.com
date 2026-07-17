import { AuthShell } from "../auth-shell";

export default function SessionsPage() {
  return (
    <AuthShell
      description="Review active devices and revoke sessions. Device data is read from secure database sessions."
      eyebrow="Account security"
      title="Active sessions"
    >
      <section className="auth-list">
        <article className="ui-card">
          <p className="ui-eyebrow">Current device</p>
          <h3>Browser session</h3>
          <p>Session revocation controls will connect to the database session service.</p>
          <button className="ui-button ui-button--secondary" type="button">
            Log out this device
          </button>
        </article>
        <button className="ui-button ui-button--danger" type="button">
          Log out all devices
        </button>
      </section>
    </AuthShell>
  );
}
