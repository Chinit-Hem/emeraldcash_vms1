"use client";

type KpiCardProps = {
  label: string;
  value: string;
  sublabel?: string;
  accent?: "green" | "blue" | "orange" | "red" | "gray";
};

function accentClasses(accent: KpiCardProps["accent"]) {
  if (accent === "blue") return "border-l-blue-600";
  if (accent === "orange") return "border-l-orange-600";
  if (accent === "red") return "border-l-red-600";
  if (accent === "gray") return "border-l-gray-600";
  return "border-l-green-700";
}

export default function KpiCard({ label, value, sublabel, accent = "green" }: KpiCardProps) {
  return (
    <div className={`ec-glassPanelSoft rounded-2xl p-4 ring-1 ring-black/5 border-l-4 ${accentClasses(accent)}`}>
      <div className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-gray-900 tabular-nums">{value}</div>
      {sublabel ? <div className="mt-1 text-xs text-gray-600">{sublabel}</div> : null}
    </div>
  );
}

