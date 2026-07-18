import { AuthLink, AuthShell } from "../auth-shell";
import { loginAction } from "../auth-actions";
import { getAuthErrorMessage } from "../auth-errors";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const errorMessage = getAuthErrorMessage((await searchParams).error);

  return (
    <AuthShell
      description="Use your email and password. Errors stay generic for account safety."
      eyebrow="Authentication"
      footer={
        <>
          <AuthLink href="/forgot-password">Forgot password?</AuthLink>
          <AuthLink href="/signup">Create coach owner account</AuthLink>
        </>
      }
      title="Log in"
    >
      <form action={loginAction} className="auth-form" method="post">
        {errorMessage ? (
          <p className="ui-alert" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <label className="ui-field">
          <span className="ui-field__label">Email</span>
          <input autoComplete="email" className="ui-input" name="email" required type="email" />
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Password</span>
          <input
            autoComplete="current-password"
            className="ui-input"
            name="password"
            required
            type="password"
          />
        </label>
        <label className="ui-check">
          <input name="rememberMe" type="checkbox" />
          <span>Remember this device</span>
        </label>
        <button className="ui-button ui-button--primary" type="submit">
          Log in
        </button>
      </form>
    </AuthShell>
  );
}
