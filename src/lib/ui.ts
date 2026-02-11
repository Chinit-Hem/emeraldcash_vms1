export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export const ui = {
  surface: {
    page:
      "bg-[var(--bg)] text-[var(--text)]",
    card:
      "ec-liquid-card",
    cardSoft:
      "ec-liquid-card-soft",
    modal:
      "ec-liquid-modal",
  },
  text: {
    title: "text-[var(--text)] font-semibold tracking-tight",
    subtitle: "text-[var(--muted)]",
    label: "text-sm font-medium text-[var(--text)]",
    helper: "text-xs text-[var(--muted)]",
    danger: "text-sm text-[var(--ec-danger-text)]",
  },
  input: {
    base:
      "ec-liquid-input h-11 w-full rounded-xl px-4 text-[var(--text)] transition-all duration-300 placeholder:text-[var(--muted)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60",
    withIcon: "pl-11",
    withRightElement: "pr-11",
    error: "ec-liquid-input-error",
  },
  button: {
    base:
      "ec-liquid-btn inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-60 disabled:pointer-events-none active:scale-[0.98]",
    size: {
      sm: "h-9 px-3.5",
      md: "h-11 px-4.5",
      lg: "h-12 px-6",
    },
    primary:
      "ec-liquid-btn-primary text-white",
    secondary:
      "ec-liquid-btn-secondary text-[var(--text)]",
    ghost:
      "ec-liquid-btn-ghost text-[var(--text)]",
    danger:
      "ec-liquid-btn-danger text-white",
    outline:
      "ec-liquid-btn-outline text-[var(--text)]",
  },
  table: {
    wrapper:
      "ec-liquid-table-wrap overflow-x-auto rounded-2xl",
    table: "ec-liquid-table w-full min-w-[1000px] border-separate border-spacing-0",
    head:
      "ec-liquid-table-head sticky top-0 z-20",
    headRow: "ec-liquid-table-headRow border-b border-[var(--border)]",
    th:
      "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]",
    tr:
      "ec-liquid-table-row border-b border-[var(--border)]",
    td: "px-4 py-3 text-sm text-[var(--text)]",
  },
};
