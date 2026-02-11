"use client";

import { Car, LayoutDashboard, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Vehicles", href: "/vehicles", icon: Car },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function MobileBottomNav() {
  const pathname = usePathname() || "/";

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/65 bg-white/70 backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/85"
      aria-label="Primary navigation"
    >
      <div className="mx-auto flex h-16 max-w-2xl items-center justify-around px-2 sm:h-[70px]">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex min-w-[84px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 transition-colors duration-200 ${
                active
                  ? "bg-emerald-50/85 text-emerald-600 dark:bg-emerald-900/25 dark:text-emerald-400"
                  : "text-slate-500 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.35 : 1.9} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
