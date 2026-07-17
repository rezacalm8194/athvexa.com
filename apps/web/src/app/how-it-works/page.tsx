import { getMarketingContext, MarketingSection, MarketingShell } from "../marketing";

export default async function HowItWorksPage({
  searchParams
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const context = await getMarketingContext(searchParams);

  return (
    <MarketingShell activePage="how-it-works" context={context}>
      <MarketingSection context={context} page="how-it-works" />
    </MarketingShell>
  );
}
