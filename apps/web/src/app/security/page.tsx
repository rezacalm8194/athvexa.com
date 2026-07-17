import { getMarketingContext, MarketingSection, MarketingShell } from "../marketing";

export default async function SecurityPage({
  searchParams
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const context = await getMarketingContext(searchParams);

  return (
    <MarketingShell activePage="security" context={context}>
      <MarketingSection context={context} page="security" />
    </MarketingShell>
  );
}
