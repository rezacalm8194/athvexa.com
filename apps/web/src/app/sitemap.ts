import type { MetadataRoute } from "next";
import { getPublicMarketingUrl } from "@fpp/config";

const publicRoutes = [
  "/",
  "/features",
  "/how-it-works",
  "/pricing",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/security",
  "/login",
  "/signup"
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getPublicMarketingUrl();
  const now = new Date();

  return publicRoutes.map((route) => ({
    url: new URL(route, baseUrl).toString(),
    lastModified: now,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.7
  }));
}
