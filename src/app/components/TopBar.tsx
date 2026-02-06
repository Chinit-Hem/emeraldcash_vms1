"use client";

import type { User } from "@/lib/types";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";

import ThemeToggle from "@/app/components/ThemeToggle";

type TopBarProps = {
  user: User;
  onMenuClick: () => void;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
};

export default function TopBar({
  user,
  onMenuClick,
  title,
  showBack,
  onBack,
}: TopBarProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <header className="sticky top-0 z-40 ec-glassPanel border-b border-black/5 dark:border-white/5 print:hidden">
      <div className="h-14 px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {showBack ? (
            <button
              type="button"
              onClick={handleBack}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-target"
              aria-label="Go back"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-gray-800 dark:text-gray-200"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-target"
              aria-label="Open menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-gray-800 dark:text-gray-200"
              >
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
            </button>
          )}

          {title && (
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
              {title}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-2 min-w-0">
          {!title && (
            <>
              <Image
                src="/logo.png"
                alt="Emerald Cash"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
                priority
              />
              <div className="min-w-0 hidden sm:block">
                <div className="text-sm font-extrabold text-gray-900 dark:text-white truncate">
                  Emerald Cash
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 truncate">VMS</div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:block text-xs text-gray-600 dark:text-gray-400 truncate max-w-[150px]">
            {user.role}: {user.username}
          </div>
          <ThemeToggle className="p-2 touch-target" />
        </div>
      </div>
    </header>
  );
}
