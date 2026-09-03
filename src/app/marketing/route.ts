import { marketingHtmlResponse, renderMarketingHtml } from "@/lib/marketingSite";

export const runtime = "nodejs";

/** Local/app-host preview of the marketing landing (same HTML as production `/` on athvexa.com). */
export async function GET(request: Request) {
  const html = await renderMarketingHtml(request);
  return marketingHtmlResponse(html);
}
