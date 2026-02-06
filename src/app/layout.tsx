import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Script from "next/script";

import "./globals.css";

export const metadata: Metadata = {
  title: "Emerald Cash - Vehicle Management System",
  description: "Emerald Cash Vehicle Management System - Premium bank-style vehicle tracking and management",
  keywords: ["vehicle", "management", "bank", "emerald", "cash", "vms"],
  authors: [{ name: "Emerald Cash" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#059669" },
    { media: "(prefers-color-scheme: dark)", color: "#047857" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Emerald Cash" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      </head>
      <body suppressHydrationWarning className="antialiased">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('vms.theme');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t;}}catch(e){}})();",
          }}
        />
        {children}
      </body>
    </html>
  );
}
