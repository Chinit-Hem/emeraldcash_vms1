"use client";

import { Check, ChevronDown, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/app/components/ThemeProvider";
import { cn, ui } from "@/lib/ui";

const themeOptions = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { mode, resolvedTheme, setThemeMode } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const ActiveIcon = mode === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;
  const activeLabel = mode[0].toUpperCase() + mode.slice(1);

  return (
    <div ref={containerRef} className={cn("relative ec-theme-toggle", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(ui.button.base, ui.button.size.sm, ui.button.secondary, "h-10 min-w-[104px] px-3")}
        aria-label="Select theme"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ActiveIcon className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{activeLabel}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Theme mode"
          className="absolute right-0 z-[120] mt-2 w-44 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900/95 dark:backdrop-blur-xl"
        >
          {themeOptions.map(({ value, label, Icon }) => {
            const selected = mode === value;

            return (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setThemeMode(value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
                  selected
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "text-[var(--text)] hover:bg-slate-100 dark:hover:bg-white/10"
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </span>
                {selected && <Check className="h-4 w-4" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
