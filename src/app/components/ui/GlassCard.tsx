"use client";

import React from "react";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "outlined";
  hover?: boolean;
  onClick?: () => void;
}

export function GlassCard({
  children,
  className = "",
  variant = "default",
  hover = false,
  onClick,
}: GlassCardProps) {
  const baseStyles =
    "relative overflow-hidden rounded-2xl backdrop-blur-xl transition-all duration-300 ease-out";

  const variants = {
    default:
      "bg-gradient-to-br from-white/90 via-white/80 to-white/70 dark:from-gray-900/90 dark:via-gray-800/80 dark:to-gray-800/70 border border-white/40 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]",
    elevated:
      "bg-gradient-to-br from-white/95 via-white/85 to-white/75 dark:from-gray-900/95 dark:via-gray-800/85 dark:to-gray-800/75 border border-white/50 dark:border-white/15 shadow-[0_12px_40px_rgba(5,150,105,0.12),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]",
    outlined:
      "bg-gradient-to-br from-white/70 via-white/60 to-white/50 dark:from-gray-900/70 dark:via-gray-800/60 dark:to-gray-800/50 border-2 border-emerald-500/30 dark:border-emerald-500/20 shadow-[0_4px_20px_rgba(5,150,105,0.08)]",
  };

  const hoverStyles = hover
    ? "hover:shadow-[0_16px_48px_rgba(5,150,105,0.15)] hover:-translate-y-1 hover:border-emerald-500/30 cursor-pointer"
    : "";

  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${hoverStyles} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Gradient overlay for liquid glass effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-red-500/5 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// Compact card for mobile lists
export function GlassCardCompact({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-xl
        bg-white/80 dark:bg-gray-800/80
        backdrop-blur-lg
        border border-white/30 dark:border-white/10
        shadow-[0_4px_16px_rgba(0,0,0,0.06)]
        transition-all duration-200
        ${onClick ? "active:scale-[0.98] cursor-pointer" : ""}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="relative z-10 p-4">{children}</div>
    </div>
  );
}
