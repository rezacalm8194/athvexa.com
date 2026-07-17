import { getMarketingContext, MarketingSection, MarketingShell } from "../marketing";

export default async function PricingPage({
  searchParams
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const context = await getMarketingContext(searchParams);

  return (
    <MarketingShell activePage="pricing" context={context}>
      <MarketingSection context={context} page="pricing" />
    </MarketingShell>
  );
}
