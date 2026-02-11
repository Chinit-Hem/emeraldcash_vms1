"use client";

type KpiCardProps = {
  label: string;
  value: string;
  sublabel?: string;
  subtitle?: string;
  accent?: "green" | "blue" | "orange" | "red" | "gray";
  onClick?: () => void;
};

function accentClasses(accent: KpiCardProps["accent"]) {
  if (accent === "blue") return "ec-metric-card-accent-blue";
  if (accent === "orange") return "ec-metric-card-accent-orange";
  if (accent === "red") return "ec-metric-card-accent-red";
  if (accent === "gray") return "ec-metric-card-accent-gray";
  return "";
}

export default function KpiCard({ label, value, sublabel, subtitle, accent = "green", onClick }: KpiCardProps) {
  return (
    <div
      className={`ec-metric-card ${accentClasses(accent)} ${onClick ? "" : "cursor-default"}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-[var(--text)] tabular-nums tracking-tight">
        {value}
      </div>
      {sublabel ? (
        <div className="mt-1 text-xs font-medium text-[var(--muted)]">
          {sublabel}
        </div>
      ) : null}
      {subtitle ? (
        <div className="mt-1 text-xs italic text-[var(--muted)]/80">
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}
