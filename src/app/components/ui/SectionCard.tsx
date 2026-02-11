"use client";

import React from "react";
import { GlassCard } from "./GlassCard";
import { cn, ui } from "@/lib/ui";

interface SectionCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  rightElement?: React.ReactNode;
}

export function SectionCard({
  title,
  icon,
  children,
  className = "",
  rightElement,
}: SectionCardProps) {
  return (
    <GlassCard
      variant="default"
      className={`overflow-visible ${className}`}
    >
      <div className="p-5 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="rounded-xl bg-emerald-100/60 p-2 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                {icon}
              </div>
            )}
            <h3 className={cn(ui.text.title, "text-lg")}>
              {title}
            </h3>
          </div>
          {rightElement && (
            <div className="flex-shrink-0">
              {rightElement}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-4">
          {children}
        </div>
      </div>
    </GlassCard>
  );
}
