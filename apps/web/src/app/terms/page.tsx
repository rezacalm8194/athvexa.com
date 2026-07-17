import { getMarketingContext, MarketingSection, MarketingShell } from "../marketing";

export default async function TermsPage({
  searchParams
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const context = await getMarketingContext(searchParams);

  return (
    <MarketingShell activePage="terms" context={context}>
      <MarketingSection context={context} page="terms" />
    </MarketingShell>
  );
}
