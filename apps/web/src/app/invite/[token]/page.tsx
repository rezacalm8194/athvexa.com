import { AuthLink, AuthShell } from "../../auth-shell";
import { getInvitationErrorMessage, getInvitationPreview } from "../../coach-invitations";

export const dynamic = "force-dynamic";

type InvitationPreview = Awaited<ReturnType<typeof getInvitationPreview>>;

export default async function InvitePage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const token = (await params).token;
  const errorMessage = getInvitationErrorMessage((await searchParams).error);
  let preview: InvitationPreview;

  try {
    preview =
      token === "invalid"
        ? ({ ok: false, error: "not_found" } as const)
        : await getInvitationPreview(token);
  } catch {
    preview = { ok: false, error: "server" };
  }

  if (!preview.ok) {
    return (
      <AuthShell
        description={getInvitationErrorMessage(preview.error) ?? "This invitation cannot be accepted."}
        eyebrow="Invitation"
        footer={<AuthLink href="/login">Log in</AuthLink>}
        title="Invitation unavailable"
      >
        {errorMessage ? (
          <p className="ui-alert" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </AuthShell>
    );
  }

  return (
    <AuthShell
      description="Create the invited account, or log in with the invited email and accept again."
      eyebrow="Workspace invitation"
      footer={<AuthLink href={`/login?returnTo=/invite/${encodeURIComponent(token)}`}>Already have an account?</AuthLink>}
      title="Accept your invitation"
    >
      <form action="/api/invitations/accept" className="auth-form" method="post">
        {errorMessage ? (
          <p className="ui-alert" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <input name="token" type="hidden" value={token} />
        <div className="auth-list">
          <p>
            Invited email: <strong>{preview.invitation.email}</strong>
          </p>
          <p>
            Role: <strong>{preview.invitation.role}</strong>
          </p>
          {preview.invitation.requiresApproval ? (
            <p>Owner approval is required before this membership becomes active.</p>
          ) : null}
        </div>
        <label className="ui-field">
          <span className="ui-field__label">Name</span>
          <input autoComplete="name" className="ui-input" name="name" />
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Password</span>
          <input
            autoComplete="new-password"
            className="ui-input"
            minLength={10}
            name="password"
            type="password"
          />
          <span className="ui-field__hint">Required only when creating a new invited account.</span>
        </label>
        <button className="ui-button ui-button--primary" type="submit">
          Accept invitation
        </button>
      </form>
    </AuthShell>
  );
}
