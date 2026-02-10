"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
const THEME_KEYS = ["theme", "vms.theme"] as const;

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const FALLBACK_THEME_CONTEXT: ThemeContextType = {
  theme: "light",
  toggleTheme: () => {
    // no-op fallback to avoid hard crashes if provider wiring is missing
  },
};

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

interface ThemeProviderProps {
  children: React.ReactNode;
}

function normalizeTheme(value: unknown): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}

function getStoredTheme(): Theme | null {
  try {
    for (const key of THEME_KEYS) {
      const parsed = normalizeTheme(localStorage.getItem(key));
      if (parsed) return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function saveTheme(theme: Theme): void {
  try {
    for (const key of THEME_KEYS) {
      localStorage.setItem(key, theme);
    }
  } catch {
    // Ignore storage errors in private mode.
  }
}

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  if (!media) return "light";
  return media.matches ? "dark" : "light";
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.dataset.theme = theme;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return getStoredTheme() ?? getSystemTheme();
  });

  useEffect(() => {
    const stored = getStoredTheme();
    const initialTheme = stored ?? getSystemTheme();
    queueMicrotask(() => {
      setTheme(initialTheme);
    });
    applyTheme(initialTheme);

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) {
      return;
    }
    const onChange = (event: MediaQueryListEvent) => {
      if (getStoredTheme()) return;
      const nextTheme = event.matches ? "dark" : "light";
      queueMicrotask(() => {
        setTheme(nextTheme);
      });
      applyTheme(nextTheme);
    };

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }

    // Safari fallback
    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!event.key || !THEME_KEYS.includes(event.key as (typeof THEME_KEYS)[number])) {
        return;
      }
      const nextTheme = getStoredTheme() ?? getSystemTheme();
      queueMicrotask(() => {
        setTheme(nextTheme);
      });
      applyTheme(nextTheme);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    saveTheme(newTheme);
    applyTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
