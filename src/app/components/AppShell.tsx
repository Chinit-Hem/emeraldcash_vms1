"use client";

import type { User } from "@/lib/types";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, type ReactNode, useEffect, useRef, useState } from "react";

import Sidebar from "@/app/components/Sidebar";
import MobileBottomNav from "@/app/components/MobileBottomNav";
import { AuthUserProvider } from "@/app/components/AuthContext";
import { clearCachedUser, getCachedUser, setCachedUser } from "@/app/components/authCache";
import ThemeToggle from "@/app/components/ThemeToggle";

type AppShellProps = {
  children: ReactNode;
};

// Maximum retries for auth check
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(() => getCachedUser());
  const [loading, setLoading] = useState(() => !getCachedUser());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasRedirected = useRef(false);
  const retryCount = useRef(0);

  useEffect(() => {
    let alive = true;

    async function checkAuth() {
      try {
        // Debug logging for mobile
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
          console.log(`[APPSHELL] Auth check attempt ${retryCount.current + 1}, pathname: ${pathname}`);
        }

        const res = await fetch("/api/auth/me", { 
          cache: "no-store",
          credentials: "same-origin",
        });
        
        if (!alive) return;

        if (!res.ok) {
          // Retry on network errors
          if (retryCount.current < MAX_RETRIES) {
            retryCount.current++;
            if (isMobile) {
              console.log(`[APPSHELL] Retry ${retryCount.current}/${MAX_RETRIES} after ${RETRY_DELAY_MS}ms`);
            }
            setTimeout(checkAuth, RETRY_DELAY_MS);
            return;
          }
          
          clearCachedUser();
          if (!hasRedirected.current) {
            hasRedirected.current = true;
            router.replace("/login");
          }
          return;
        }

        const data = await res.json();
        if (!alive) return;

        if (!data?.ok || !data?.user) {
          clearCachedUser();
          if (!hasRedirected.current) {
            hasRedirected.current = true;
            router.replace("/login");
          }
          return;
        }

        // Success - reset retry count
        retryCount.current = 0;
        if (isMobile) {
          console.log(`[APPSHELL] Auth success for user: ${data.user.username}`);
        }

        setCachedUser(data.user as User);
        setUser(data.user as User);
      } catch (err) {
        if (!alive) return;
        
        // Retry on errors
        if (retryCount.current < MAX_RETRIES) {
          retryCount.current++;
          if (isMobile) {
            console.log(`[APPSHELL] Retry ${retryCount.current}/${MAX_RETRIES} after error:`, err);
          }
          setTimeout(checkAuth, RETRY_DELAY_MS);
          return;
        }

        setError("Failed to authenticate. Please try again.");
        clearCachedUser();
        if (!hasRedirected.current) {
          hasRedirected.current = true;
          router.replace("/login");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    checkAuth();
    return () => {
      alive = false;
    };
  }, [router, pathname]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Error boundary fallback
  if (error && !loading) {
    return (
      <div className="min-h-screen-safe flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 text-red-600"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Connection Error
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold rounded-xl shadow-lg transition-all active:scale-[0.98] touch-target"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen-safe flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-800" />
            <div className="absolute inset-0 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen-safe bg-transparent print:bg-white pb-safe lg:pb-0">
      <AuthUserProvider user={user}>
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <Suspense fallback={null}>
            <Sidebar user={user} />
          </Suspense>
        </div>

        {/* Mobile drawer */}
        {isSidebarOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden print:hidden">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsSidebarOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[82vw] ec-glassPanel shadow-xl">
              <Suspense fallback={null}>
                <Sidebar user={user} onNavigate={() => setIsSidebarOpen(false)} />
              </Suspense>
            </div>
          </div>
        ) : null}

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Mobile top bar */}
          <header className="lg:hidden sticky top-0 z-40 ec-glassPanel border-b border-black/5 dark:border-white/5 print:hidden">
            <div className="h-14 px-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-target"
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
                  aria-hidden="true"
                >
                  <path d="M4 6h16" />
                  <path d="M4 12h16" />
                  <path d="M4 18h16" />
                </svg>
              </button>

              <div className="flex items-center gap-2 min-w-0">
                <Image
                  src="/logo.png"
                  alt="Emerald Cash"
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                  priority
                />
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-gray-900 dark:text-white truncate">
                    Emerald Cash
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 truncate">VMS</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-xs text-gray-600 dark:text-gray-400 truncate max-w-[100px]">
                  {user.role}: {user.username}
                </div>
                <ThemeToggle className="p-2 touch-target" />
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-auto print:overflow-visible pb-20 lg:pb-0">
            {children}
          </main>

          {/* Mobile bottom navigation */}
          <MobileBottomNav onSettingsClick={() => setIsSidebarOpen(true)} />
        </div>
      </AuthUserProvider>
    </div>
  );
}
