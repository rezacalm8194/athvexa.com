import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATHVEXA | Coach Player Development",
  description:
    "Mobile-first football performance software for coaches to plan training, track wellness, guide habits, and support players offline.",
  icons: {
    icon: [
      { url: "/brand/favicon.ico" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" }
    ],
    apple: [{ url: "/brand/athvexa-icon-192.png", sizes: "192x192", type: "image/png" }]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
