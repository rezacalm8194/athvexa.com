import { getMarketingContext, MarketingHero, MarketingSection, MarketingShell } from "./marketing";

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const context = await getMarketingContext(searchParams);

  return (
    <MarketingShell activePage="home" context={context}>
      <MarketingHero context={context} />
      <MarketingSection context={context} page="home" />
    </MarketingShell>
  );
}
