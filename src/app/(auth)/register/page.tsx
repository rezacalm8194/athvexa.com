import AuthShell from "@/components/AuthShell";
import RegisterForm from "@/components/RegisterForm";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/userPreferences";

export default async function RegisterPage() {
  const locale = await getRequestLocale();
  return (
    <AuthShell title={t(locale, "auth.registerTitle")} subtitle={t(locale, "auth.registerSubtitle")}>
      <RegisterForm locale={locale} />
    </AuthShell>
  );
}
