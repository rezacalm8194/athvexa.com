import { getMarketingContext, MarketingSection, MarketingShell } from "../marketing";

export default async function PrivacyPage({
  searchParams
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const context = await getMarketingContext(searchParams);

  return (
    <MarketingShell activePage="privacy" context={context}>
      <MarketingSection context={context} page="privacy" />
    </MarketingShell>
  );
}
