import type { MetadataRoute } from "next";
import { getPublicMarketingUrl } from "@fpp/config";

export default function manifest(): MetadataRoute.Manifest {
  const baseUrl = getPublicMarketingUrl();

  return {
    name: "ATHVEXA",
    short_name: "ATHVEXA",
    description: "Football performance software for coach-led player development.",
    start_url: new URL("/", baseUrl).toString(),
    scope: new URL("/", baseUrl).toString(),
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    icons: [
      {
        src: new URL("/brand/athvexa-icon-192.png", baseUrl).toString(),
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: new URL("/brand/athvexa-icon-512.png", baseUrl).toString(),
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}
