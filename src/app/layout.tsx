import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

const themeInitScript = `
  (function () {
    try {
      var modeKey = "vms.theme-mode";
      var legacyKeys = ["theme", "vms.theme"];
      var mode = localStorage.getItem(modeKey);

      if (mode !== "light" && mode !== "dark" && mode !== "system") {
        for (var i = 0; i < legacyKeys.length; i++) {
          var legacy = localStorage.getItem(legacyKeys[i]);
          if (legacy === "light" || legacy === "dark") {
            mode = legacy;
            break;
          }
        }
      }

      if (!mode) mode = "system";
      var isDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      var resolved = mode === "system" ? (isDark ? "dark" : "light") : mode;
      var root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(resolved);
      root.dataset.theme = resolved;
      root.dataset.themeMode = mode;
    } catch (_) {}
  })();
`;

const iosSafariGuardScript = `
  (function () {
    try {
      var ua = navigator.userAgent || "";
      var platform = navigator.platform || "";
      var maxTouchPoints = navigator.maxTouchPoints || 0;

      var isIOSDevice =
        /iP(hone|ad|od)/.test(ua) ||
        (platform === "MacIntel" && maxTouchPoints > 1);

      var isWebKitEngine = /WebKit/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|YaBrowser/i.test(ua);
      if (!isIOSDevice || !isWebKitEngine) return;

      document.documentElement.classList.add("ios-safari");
    } catch (_) {}
  })();
`;

export const metadata: Metadata = {
  title: "Emerald Cash VMS",
  description: "Vehicle Management System by Emerald Cash",
  icons: {
    icon: "/favicon.ico",
  },
};

// Separate viewport export for Next.js 14+
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ecfdf5" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script id="ios-safari-guard" dangerouslySetInnerHTML={{ __html: iosSafariGuardScript }} />
        <script id="theme-init" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
