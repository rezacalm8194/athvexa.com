import { Suspense } from "react";
import AuthShell from "@/components/AuthShell";
import LoginForm from "@/components/LoginForm";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/userPreferences";

export default async function LoginPage() {
  const locale = await getRequestLocale();
  return (
    <AuthShell title={t(locale, "auth.loginTitle")} subtitle={t(locale, "auth.loginSubtitle")}>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-md bg-white/5" />}>
        <LoginForm locale={locale} />
      </Suspense>
    </AuthShell>
  );
}
