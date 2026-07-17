import { getMarketingContext, MarketingSection, MarketingShell } from "../marketing";

export default async function FeaturesPage({
  searchParams
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const context = await getMarketingContext(searchParams);

  return (
    <MarketingShell activePage="features" context={context}>
      <MarketingSection context={context} page="features" />
    </MarketingShell>
  );
}
