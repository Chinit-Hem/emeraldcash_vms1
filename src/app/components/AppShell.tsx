"use client";

import type { User } from "@/lib/types";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, type ReactNode, useEffect, useRef, useState } from "react";

import Sidebar from "@/app/components/Sidebar";
import MobileBottomNav from "@/app/components/MobileBottomNav";
import ThemeToggle from "@/app/components/ThemeToggle";
import { AuthUserProvider } from "@/app/components/AuthContext";
import { UIProvider, useUI } from "@/app/components/UIContext";
import { clearCachedUser, getCachedUser, setCachedUser } from "@/app/components/authCache";

type AppShellProps = {
  children: ReactNode;
};

function AppShellContent({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isModalOpen } = useUI();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasRedirected = useRef(false);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    console.log("[APPSHELL] Starting auth check...");

    // IMMEDIATE: Check cached user first to show something quickly
    const cached = getCachedUser();
    if (cached) {
      console.log("[APPSHELL] Using cached user immediately:", cached.username);
      queueMicrotask(() => {
        if (!isActive) return;
        setUser(cached);
        setLoading(false);
      });
    }

    async function checkAuth() {
      try {
        console.log("[APPSHELL] Fetching /api/auth/me...");
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!isActive) {
          return;
        }

        console.log("[APPSHELL] Auth response status:", res.status);
        const data = await res.json().catch(() => null);
        console.log("[APPSHELL] Auth response:", data);

        if (!res.ok || !data?.ok || !data?.user) {
          console.log("[APPSHELL] Auth failed:", data?.error || "no user");
          clearCachedUser();
          setUser(null);
          setLoading(false);

          if (!hasRedirected.current) {
            hasRedirected.current = true;
            router.replace("/login");
          }
          return;
        }

        console.log("[APPSHELL] Auth success:", data.user.username);
        setCachedUser(data.user as User);
        setUser(data.user as User);
        setError(null);
        setLoading(false);
      } catch (err) {
        if (!isActive) return;
        console.error("[APPSHELL] Auth error:", err);

        const isAbortError = err instanceof Error && err.name === "AbortError";
        if (!cached) {
          setError(
            isAbortError
              ? "Connection timed out. Please check your network and try again."
              : "Connection failed. Please check your network and try again."
          );
        }
        setLoading(false);
      }
    }

    // Always run server check, even if we have cached user
    checkAuth();
    
    return () => {
      isActive = false;
      controller.abort();
    };
  }, [router]);

  // Close sidebar when pathname changes (using layout effect to avoid setState in render warning)
  useEffect(() => {
    // Use requestAnimationFrame to defer state update to next frame
    const rafId = requestAnimationFrame(() => {
      setIsSidebarOpen(false);
    });
    return () => cancelAnimationFrame(rafId);
  }, [pathname]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-600 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md p-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Connection Error</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold rounded-xl"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-transparent pb-safe lg:pb-0">
      <AuthUserProvider user={user}>
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <Suspense fallback={null}>
            <Sidebar user={user} />
          </Suspense>
        </div>

        {/* Mobile drawer - Premium glass slide-over */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 z-50 lg:hidden"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsSidebarOpen(false);
            }}
          >
            <div
              className="absolute inset-0 ec-sidebar-drawer-backdrop transition-opacity duration-300"
              onClick={() => setIsSidebarOpen(false)}
              aria-hidden="true"
            />
            <div 
              className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] h-full overflow-hidden shadow-2xl animate-in slide-in-from-left duration-300"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <Suspense fallback={null}>
                <Sidebar user={user} onNavigate={() => setIsSidebarOpen(false)} />
              </Suspense>
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Mobile header - Liquid Glass White */}
          <header className="lg:hidden sticky top-0 z-40 ec-glassPanel ec-theme-overlay-host border-b border-white/40 dark:border-white/10">
            <div className="h-14 px-4 flex items-center justify-between">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-white/10 text-slate-600 dark:text-white/80 hover:text-emerald-600 dark:hover:text-white transition-all touch-target active-scale"
                aria-label="Open navigation menu"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-lg bg-white flex items-center justify-center overflow-hidden shadow-lg ring-2 ring-emerald-100">
                  <Image 
                    src="/logo.png" 
                    alt="Emerald Cash" 
                    width={28} 
                    height={28} 
                    className="w-7 h-7 object-contain" 
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 dark:text-white text-sm leading-tight">Emerald Cash</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">VMS PRO</span>
                </div>
              </div>

              <ThemeToggle className="shrink-0" />
            </div>
          </header>


          {/* Main content */}
          <main className="flex-1 overflow-auto pb-24 lg:pb-24">
            {children}
          </main>

          {/* Bottom nav - shared across mobile and desktop */}
          {!isModalOpen && (
            <MobileBottomNav />
          )}
        </div>
      </AuthUserProvider>
    </div>
  );
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <UIProvider>
      <AppShellContent>{children}</AppShellContent>
    </UIProvider>
  );
}
