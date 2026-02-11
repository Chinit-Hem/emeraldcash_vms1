"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import ThemeToggle from "@/app/components/ThemeToggle";
import { clearCachedUser } from "@/app/components/authCache";
import { useAuthUser } from "@/app/components/AuthContext";

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthUser();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to logout?");
    if (!confirmed) return;

    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      clearCachedUser();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      window.alert("Logout failed. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 lg:pb-24">
      <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-900/70">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Settings
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Manage account preferences and security options.
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4 dark:border-white/10 dark:bg-slate-800/70">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Dark Mode
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Change app theme for this device.
              </p>
              <div className="mt-3">
                <ThemeToggle />
              </div>
            </div>

            <div className="rounded-xl border border-rose-200/80 bg-rose-50/70 p-4 dark:border-rose-500/25 dark:bg-rose-900/20">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Account
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Signed in as {user.username} ({user.role})
              </p>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="mt-3 inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Back to Dashboard
            </Link>
            <Link
              href="/vehicles"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-white/20 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Open Vehicles
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
