import type { Metadata, Viewport } from "next";
import { Inter, Barlow_Condensed, Vazirmatn } from "next/font/google";
import { cookies, headers } from "next/headers";
import { getSession } from "@/lib/session";
import { db, ensureDatabase } from "@/lib/db";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  variable: "--font-barlow",
  weight: ["700"],
  display: "swap",
  preload: false,
});
const vazirmatn = Vazirmatn({ subsets: ["arabic"], variable: "--font-vazirmatn", display: "swap", preload: false });

export const metadata: Metadata = {
  title: "Athvexa — Football Performance Platform",
  description: "Daily readiness, training and recovery for players and coaches.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  let userLocale: string | null = null;
  if (session) {
    await ensureDatabase();
    userLocale = (await db.user.findUnique({ where: { id: session.sub }, select: { locale: true } }))?.locale ?? null;
  }
  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value;
  const acceptLanguage = (await headers()).get("accept-language")?.toLowerCase() ?? "";
  const locale = userLocale === "fa" || (!userLocale && (cookieLocale === "fa" || (!cookieLocale && acceptLanguage.startsWith("fa")))) ? "fa" : "en";
  return (
    <html lang={locale} dir={locale === "fa" ? "rtl" : "ltr"} className={`${inter.variable} ${barlow.variable} ${vazirmatn.variable}`}>
      <body className="font-body antialiased">
        <RegisterServiceWorker />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
