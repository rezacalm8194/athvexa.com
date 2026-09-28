import InviteLanding from "@/components/InviteLanding";
import { getRequestLocale } from "@/lib/userPreferences";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const locale = await getRequestLocale();
  return <InviteLanding token={token} locale={locale} />;
}
