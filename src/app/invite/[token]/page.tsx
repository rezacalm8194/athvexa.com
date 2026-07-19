import AuthShell from "@/components/AuthShell";
import RegisterForm from "@/components/RegisterForm";

export default function InvitePage({ params }: { params: { token: string } }) {
  return (
    <AuthShell
      title="Join your coach on Athvexa"
      subtitle="Create your player account to get today's training and check in."
    >
      <RegisterForm inviteToken={params.token} />
    </AuthShell>
  );
}
