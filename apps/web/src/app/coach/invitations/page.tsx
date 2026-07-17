import Link from "next/link";
import { invitationRoles, invitationScopeModes } from "@fpp/validation";

const pendingInvitations = [
  {
    email: "coach@example.com",
    role: "Coach",
    expires: "14 days",
    usage: "0 / 1",
    status: "Pending"
  },
  {
    email: "assistant@example.com",
    role: "Assistant",
    expires: "7 days",
    usage: "0 / 1",
    status: "Needs approval"
  },
  {
    email: "player@example.com",
    role: "Player",
    expires: "3 days",
    usage: "0 / 1",
    status: "Pending"
  }
];

export default function InvitationsPage() {
  return (
    <main className="coach-shell" data-theme="dark">
      <header className="coach-header">
        <div>
          <p className="ui-eyebrow">Invitations</p>
          <h1>Invite by role and scope.</h1>
        </div>
        <p>
          Invitation tokens are stored as hashes in the database plan. This local UI prepares the owner
          flow before email delivery and acceptance endpoints are connected.
        </p>
        <div className="coach-header__actions">
          <Link className="ui-button ui-button--secondary" href="/coach/members">
            Members
          </Link>
          <Link className="ui-button ui-button--secondary" href="/coach">
            Dashboard
          </Link>
        </div>
      </header>

      <section className="invitation-layout">
        <form action="/coach/invitations" className="invitation-form" method="get">
          <div>
            <p className="ui-eyebrow">New invitation</p>
            <h2>Access details</h2>
          </div>

          <label className="ui-field">
            <span className="ui-field__label">Email</span>
            <input className="ui-input" name="email" placeholder="coach@example.com" required type="email" />
          </label>

          <label className="ui-field">
            <span className="ui-field__label">Role</span>
            <select className="ui-input ui-select" defaultValue="coach" name="role" required>
              {invitationRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          <div className="invitation-form__grid">
            <label className="ui-field">
              <span className="ui-field__label">Expires in days</span>
              <input className="ui-input" defaultValue={14} min={1} max={90} name="expiresInDays" type="number" />
            </label>
            <label className="ui-field">
              <span className="ui-field__label">Usage limit</span>
              <input className="ui-input" defaultValue={1} min={1} max={100} name="usageLimit" type="number" />
            </label>
          </div>

          <div className="invitation-form__grid">
            <label className="ui-field">
              <span className="ui-field__label">Team scope</span>
              <select className="ui-input ui-select" defaultValue="assigned" name="teamScopeMode">
                {invitationScopeModes.map((scope) => (
                  <option key={scope} value={scope}>
                    {scope}
                  </option>
                ))}
              </select>
            </label>
            <label className="ui-field">
              <span className="ui-field__label">Player scope</span>
              <select className="ui-input ui-select" defaultValue="assigned" name="playerScopeMode">
                {invitationScopeModes.map((scope) => (
                  <option key={scope} value={scope}>
                    {scope}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="ui-check">
            <input name="requiresApproval" type="checkbox" />
            <span>Require owner approval after acceptance</span>
          </label>

          <button className="ui-button ui-button--primary" type="submit">
            Prepare invitation
          </button>
        </form>

        <section className="invitation-list" aria-label="Pending invitations">
          <div>
            <p className="ui-eyebrow">Pending</p>
            <h2>Invitation queue</h2>
          </div>
          {pendingInvitations.map((invitation) => (
            <article className="invitation-item" key={invitation.email}>
              <div>
                <strong>{invitation.email}</strong>
                <span>
                  {invitation.role} · expires in {invitation.expires} · used {invitation.usage}
                </span>
              </div>
              <span className="ui-badge" data-tone={invitation.status === "Pending" ? "info" : "warning"}>
                {invitation.status}
              </span>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
