"use client";

import { useEffect } from "react";

export default function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline support is a nice-to-have — fail silently in dev/unsupported browsers.
      });
    }
  }, []);
  return null;
}
