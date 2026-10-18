"use client";

import { useEffect } from "react";

export default function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const authPath = /^\/(login|register)(\/|$)/.test(window.location.pathname);
    if (authPath) {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((reg) => reg.unregister())).catch(() => undefined);
      return;
    }
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((registration) => registration.update()).catch(() => {
      // Offline support is a nice-to-have — fail silently in dev/unsupported browsers.
    });
  }, []);
  return null;
}
