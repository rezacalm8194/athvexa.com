import { getMarketingContext, MarketingSection, MarketingShell } from "../marketing";

export default async function AboutPage({
  searchParams
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const context = await getMarketingContext(searchParams);

  return (
    <MarketingShell activePage="about" context={context}>
      <MarketingSection context={context} page="about" />
    </MarketingShell>
  );
}
