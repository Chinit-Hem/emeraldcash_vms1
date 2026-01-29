"use client";

import type { User } from "@/lib/types";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, type ReactNode, useEffect, useState } from "react";

import Sidebar from "@/app/components/Sidebar";
import { AuthUserProvider } from "@/app/components/AuthContext";
import { clearCachedUser, getCachedUser, setCachedUser } from "@/app/components/authCache";
import ThemeToggle from "@/app/components/ThemeToggle";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(() => getCachedUser());
  const [loading, setLoading] = useState(() => !getCachedUser());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    let alive = true;

    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          clearCachedUser();
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (!alive) return;

        if (!data?.ok || !data?.user) {
          clearCachedUser();
          router.push("/login");
          return;
        }

        setCachedUser(data.user as User);
        setUser(data.user as User);
      } catch {
        clearCachedUser();
        if (alive) router.push("/login");
      } finally {
        if (alive) setLoading(false);
      }
    }

    checkAuth();
    return () => {
      alive = false;
    };
  }, [router]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-transparent print:bg-white">
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
              className="absolute inset-0 bg-black/50"
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
          <header className="lg:hidden sticky top-0 z-40 ec-glassPanel border-b border-black/5 print:hidden">
            <div className="h-14 px-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100 transition"
                aria-label="Open menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 text-gray-800"
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
                  <div className="text-sm font-extrabold text-gray-900 truncate">Emerald Cash</div>
                  <div className="text-xs text-gray-600 truncate">VMS</div>
                </div>
              </div>

              <div className="text-xs text-gray-600 truncate max-w-[40%]">
                {user.role}: {user.username}
              </div>

              <ThemeToggle className="px-2 py-2" />
            </div>
          </header>

          <main className="flex-1 overflow-auto print:overflow-visible">{children}</main>
        </div>
      </AuthUserProvider>
    </div>
  );
}
