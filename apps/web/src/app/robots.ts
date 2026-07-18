import type { MetadataRoute } from "next";
import { getPublicMarketingUrl } from "@fpp/config";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicMarketingUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/"
    },
    sitemap: new URL("/sitemap.xml", baseUrl).toString()
  };
}
