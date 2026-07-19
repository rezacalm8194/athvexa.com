import AuthShell from "@/components/AuthShell";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <AuthShell title="Sign in" subtitle="Welcome back to Athvexa.">
      <LoginForm />
    </AuthShell>
  );
}
