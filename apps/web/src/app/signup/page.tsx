import { AuthLink, AuthShell } from "../auth-shell";
import { getAuthErrorMessage } from "../auth-errors";

export default async function SignupPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const errorMessage = getAuthErrorMessage((await searchParams).error);

  return (
    <AuthShell
      description="Public signup is only for the coach owner who creates a new workspace."
      eyebrow="Coach owner signup"
      footer={<AuthLink href="/login">Already have an account?</AuthLink>}
      title="Create your workspace"
    >
      <form action="/api/auth/signup" className="auth-form" method="post">
        {errorMessage ? (
          <p className="ui-alert" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <label className="ui-field">
          <span className="ui-field__label">Name</span>
          <input autoComplete="name" className="ui-input" name="name" required />
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Email</span>
          <input autoComplete="email" className="ui-input" name="email" required type="email" />
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Password</span>
          <input
            autoComplete="new-password"
            className="ui-input"
            minLength={10}
            name="password"
            required
            type="password"
          />
          <span className="ui-field__hint">Use at least 10 characters with upper, lower, and number.</span>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Workspace name</span>
          <input className="ui-input" name="workspaceName" required />
        </label>
        <button className="ui-button ui-button--primary" type="submit">
          Start onboarding
        </button>
      </form>
    </AuthShell>
  );
}
