import { AuthLink, AuthShell } from "../auth-shell";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      description="If an account exists, a reset link will be sent. The response is always generic."
      eyebrow="Password reset"
      footer={<AuthLink href="/login">Back to login</AuthLink>}
      title="Reset password"
    >
      <form className="auth-form" method="post">
        <label className="ui-field">
          <span className="ui-field__label">Email</span>
          <input autoComplete="email" className="ui-input" name="email" required type="email" />
        </label>
        <button className="ui-button ui-button--primary" type="submit">
          Send reset link
        </button>
      </form>
    </AuthShell>
  );
}
