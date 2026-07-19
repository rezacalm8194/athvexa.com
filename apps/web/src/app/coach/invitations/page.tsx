import Link from "next/link";
import { cookies } from "next/headers";
import { sessionCookieName } from "@fpp/auth";
import { invitationScopeModes } from "@fpp/validation";
import {
  getInvitationErrorMessage,
  listWorkspaceInvitationsByToken
} from "../../coach-invitations";
import { InvitationSharePanel } from "./invitation-share-panel";
import { InvitationRoleFields } from "./invitation-role-fields";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(value);
}

function getSearchString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getSafeInviteLink(value: string | string[] | undefined) {
  const candidate = getSearchString(value);

  if (!candidate) {
    return undefined;
  }

  try {
    const url = new URL(candidate);

    if (!["http:", "https:"].includes(url.protocol) || !url.pathname.startsWith("/invite/")) {
      return undefined;
    }

    return url.toString();
  } catch {
    return undefined;
  }
}

export default async function InvitationsPage({
  searchParams
}: {
  searchParams: Promise<{
    created?: string;
    error?: string | string[];
    inviteEmail?: string | string[];
    inviteLink?: string | string[];
    inviteRole?: string | string[];
    revoked?: string;
  }>;
}) {
  const cookieStore = await cookies();
  const resolvedSearchParams = await searchParams;
  const invitationResult = await listWorkspaceInvitationsByToken(
    cookieStore.get(sessionCookieName)?.value
  ).catch(() => ({ ok: false as const, error: "server" as const }));
  const errorMessage =
    getInvitationErrorMessage(resolvedSearchParams.error) ??
    (invitationResult.ok ? undefined : getInvitationErrorMessage(invitationResult.error));
  const inviteLink = getSafeInviteLink(resolvedSearchParams.inviteLink);
  const inviteEmail = getSearchString(resolvedSearchParams.inviteEmail);
  const inviteRole = getSearchString(resolvedSearchParams.inviteRole);

  return (
    <main className="coach-shell" data-theme="dark">
      <header className="coach-header">
        <div>
          <p className="ui-eyebrow">Invitations</p>
          <h1>Invite by role and scope.</h1>
        </div>
        <p>
          Invitation tokens are stored as hashes. Email delivery is still staged for later, but
          owners can prepare scoped invitations and revoke pending access here.
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
        <form action="/api/coach/invitations" className="invitation-form" method="post">
          {errorMessage ? (
            <p className="ui-alert" role="alert">
              {errorMessage}
            </p>
          ) : null}
          {inviteLink && inviteEmail && inviteRole ? (
            <InvitationSharePanel email={inviteEmail} inviteLink={inviteLink} role={inviteRole} />
          ) : resolvedSearchParams.created ? (
            <p className="ui-alert ui-alert--success" role="status">
              Invitation prepared, but the share link was not returned. Try again and keep this page open.
            </p>
          ) : null}
          {resolvedSearchParams.revoked ? (
            <p className="ui-alert ui-alert--success" role="status">
              Invitation revoked.
            </p>
          ) : null}

          <div>
            <p className="ui-eyebrow">New invitation</p>
            <h2>Access details</h2>
          </div>

          <label className="ui-field">
            <span className="ui-field__label">Email</span>
            <input className="ui-input" name="email" placeholder="coach@example.com" required type="email" />
          </label>

          <div className="invitation-form__grid">
            <InvitationRoleFields />
          </div>

          <div className="invitation-form__grid">
            <label className="ui-field">
              <span className="ui-field__label">Expires in days</span>
              <input className="ui-input" defaultValue={14} min={1} max={90} name="expiresInDays" type="number" />
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
          {invitationResult.ok && invitationResult.invitations.length > 0 ? (
            invitationResult.invitations.map((invitation) => (
              <article className="invitation-item" key={invitation.id}>
                <div>
                  <strong>{invitation.email}</strong>
                  <span>
                    {invitation.role} · expires {formatDate(invitation.expiresAt)} · used{" "}
                    {invitation.usageCount} / {invitation.usageLimit}
                  </span>
                  <span>
                    Team scope: {invitation.teamScopeMode} · player scope: {invitation.playerScopeMode}
                  </span>
                </div>
                <div className="invitation-item__actions">
                  <span className="ui-badge" data-tone={invitation.badgeTone}>
                    {invitation.status}
                  </span>
                  <form action="/api/coach/invitations/revoke" method="post">
                    <input name="invitationId" type="hidden" value={invitation.id} />
                    <button className="ui-button ui-button--secondary" type="submit">
                      Revoke
                    </button>
                  </form>
                </div>
              </article>
            ))
          ) : (
            <article className="invitation-item">
              <div>
                <strong>No pending invitations</strong>
                <span>Prepared invitations will appear here after the database is connected.</span>
              </div>
            </article>
          )}
        </section>
      </section>
    </main>
  );
}
