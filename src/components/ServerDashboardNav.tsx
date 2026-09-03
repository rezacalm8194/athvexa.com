import DashboardNav from "@/components/DashboardNav";
import { roleLabel, type Locale } from "@/lib/i18n";
import { getSession } from "@/lib/session";
import { getUserPreferences } from "@/lib/userPreferences";

type Props = {
  name: string;
  roleLabel?: string;
  subtitle?: string;
  notificationCount?: number;
  settingsHref?: string;
  locale?: Locale;
};

export default async function ServerDashboardNav({ locale: localeProp, roleLabel: roleLabelProp, name, ...rest }: Props) {
  const session = await getSession();
  const locale = localeProp ?? (session ? (await getUserPreferences(session.sub)).locale : "en");
  const label = roleLabelProp ?? (session ? roleLabel(session.role, locale) : name);
  return <DashboardNav name={name} roleLabel={label} locale={locale} {...rest} />;
}
