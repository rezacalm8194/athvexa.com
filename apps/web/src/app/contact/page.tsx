import { getMarketingContext, MarketingSection, MarketingShell } from "../marketing";

export default async function ContactPage({
  searchParams
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const context = await getMarketingContext(searchParams);

  return (
    <MarketingShell activePage="contact" context={context}>
      <MarketingSection context={context} page="contact" />
    </MarketingShell>
  );
}
