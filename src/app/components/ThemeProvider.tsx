"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type ResolvedTheme = "light" | "dark";
export type ThemeMode = ResolvedTheme | "system";

const THEME_MODE_KEY = "vms.theme-mode";
const LEGACY_THEME_KEYS = ["theme", "vms.theme"] as const;
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

interface ThemeContextType {
  mode: ThemeMode;
  theme: ResolvedTheme;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (mode: ThemeMode) => void;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const FALLBACK_THEME_CONTEXT: ThemeContextType = {
  mode: "system",
  theme: "light",
  resolvedTheme: "light",
  setThemeMode: () => {
    // no-op fallback to avoid hard crashes if provider wiring is missing
  },
  setTheme: () => {
    // no-op fallback to avoid hard crashes if provider wiring is missing
  },
  toggleTheme: () => {
    // no-op fallback to avoid hard crashes if provider wiring is missing
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function isResolvedTheme(value: unknown): value is ResolvedTheme {
  return value === "light" || value === "dark";
}

function resolveTheme(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  if (mode === "system") return prefersDark ? "dark" : "light";
  return mode;
}

function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.(SYSTEM_THEME_QUERY).matches ?? false;
}

function readStoredThemeMode(): ThemeMode | null {
  if (typeof window === "undefined") return null;

  try {
    const storedMode = localStorage.getItem(THEME_MODE_KEY);
    if (isThemeMode(storedMode)) {
      return storedMode;
    }

    for (const legacyKey of LEGACY_THEME_KEYS) {
      const legacyTheme = localStorage.getItem(legacyKey);
      if (isResolvedTheme(legacyTheme)) {
        return legacyTheme;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function persistThemeMode(mode: ThemeMode): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(THEME_MODE_KEY, mode);

    if (mode === "system") {
      for (const legacyKey of LEGACY_THEME_KEYS) {
        localStorage.removeItem(legacyKey);
      }
      return;
    }

    for (const legacyKey of LEGACY_THEME_KEYS) {
      localStorage.setItem(legacyKey, mode);
    }
  } catch {
    // Ignore storage errors in private mode.
  }
}

function applyResolvedTheme(resolvedTheme: ResolvedTheme, mode: ThemeMode): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolvedTheme);
  root.dataset.theme = resolvedTheme;
  root.dataset.themeMode = mode;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[ThemeProvider] useTheme called without provider, using fallback theme context");
    }
    return FALLBACK_THEME_CONTEXT;
  }
  return context;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    return readStoredThemeMode() ?? "system";
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    getSystemPrefersDark()
  );
  const resolvedTheme = resolveTheme(mode, systemPrefersDark);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.(SYSTEM_THEME_QUERY);
    if (!mediaQuery) return;

    const onMediaChange = () => {
      setSystemPrefersDark(mediaQuery.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", onMediaChange);
      return () => mediaQuery.removeEventListener("change", onMediaChange);
    }

    mediaQuery.addListener(onMediaChange);
    return () => mediaQuery.removeListener(onMediaChange);
  }, []);

  useEffect(() => {
    applyResolvedTheme(resolvedTheme, mode);
  }, [mode, resolvedTheme]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      const key = event.key;
      if (!key) return;

      if (key !== THEME_MODE_KEY && !LEGACY_THEME_KEYS.includes(key as (typeof LEGACY_THEME_KEYS)[number])) {
        return;
      }

      const nextMode = readStoredThemeMode() ?? "system";
      setMode(nextMode);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setThemeMode = (nextMode: ThemeMode) => {
    setMode(nextMode);
    persistThemeMode(nextMode);
  };

  const toggleTheme = () => {
    setThemeMode(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider
      value={{
        mode,
        theme: resolvedTheme,
        resolvedTheme,
        setThemeMode,
        setTheme: setThemeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
