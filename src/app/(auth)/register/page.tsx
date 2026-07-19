import AuthShell from "@/components/AuthShell";
import RegisterForm from "@/components/RegisterForm";

export default function RegisterPage() {
  return (
    <AuthShell title="Create your account" subtitle="Tell us who you are to get started.">
      <RegisterForm />
    </AuthShell>
  );
}
