export function isIOSSafariBrowser(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  // Fast path: class is set very early in src/app/layout.tsx.
  if (document.documentElement.classList.contains("ios-safari")) return true;

  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  const isIOSDevice =
    /iP(hone|ad|od)/i.test(ua) ||
    (platform === "MacIntel" && maxTouchPoints > 1);

  const isWebKitSafari =
    /WebKit/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|YaBrowser/i.test(ua);

  return isIOSDevice && isWebKitSafari;
}
