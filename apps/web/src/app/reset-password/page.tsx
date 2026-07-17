import { AuthLink, AuthShell } from "../auth-shell";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      description="Set a new password from a valid reset link. Existing sessions can be revoked after reset."
      eyebrow="Password reset"
      footer={<AuthLink href="/login">Back to login</AuthLink>}
      title="Choose new password"
    >
      <form className="auth-form" method="post">
        <input name="token" type="hidden" value="" />
        <label className="ui-field">
          <span className="ui-field__label">New password</span>
          <input
            autoComplete="new-password"
            className="ui-input"
            minLength={10}
            name="password"
            required
            type="password"
          />
        </label>
        <button className="ui-button ui-button--primary" type="submit">
          Update password
        </button>
      </form>
    </AuthShell>
  );
}
