"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ThemeToggle from "@/app/components/ThemeToggle";
import { GlassButton } from "@/app/components/ui/GlassButton";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Navigation guard to prevent redirect loops
  const hasRedirected = useRef(false);

  // Load remembered username
  useEffect(() => {
    const remembered = localStorage.getItem("ec_remember_username");
    if (remembered) {
      setUsername(remembered);
      setRememberMe(true);
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const trimmedUsername = username.trim();
      
      // Step 1: Login
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: trimmedUsername, 
          password: password 
        }),
        credentials: "include",
      });

      const loginData = await loginRes.json();
      
      if (!loginRes.ok || !loginData.ok) {
        throw new Error(loginData.error || "Login failed");
      }

      setSuccess("Login successful! Loading your data...");

      // Step 2: Verify session with retry logic
      let meData = null;
      let meRes = null;
      let retries = 3;
      
      while (retries > 0) {
        await new Promise(r => setTimeout(r, 800)); // Wait for cookie to be set
        
        meRes = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
          headers: {
            "Accept": "application/json",
          },
        });
        
        meData = await meRes.json();
        
        if (meRes.ok && meData.ok) {
          break; // Success!
        }
        
        console.log(`[LOGIN] Session check attempt ${4 - retries} failed:`, meData.error);
        retries--;
        
        if (retries === 0) {
          throw new Error(meData.error || "Session verification failed after multiple attempts");
        }
      }

      // Success!
      if (rememberMe) {
        localStorage.setItem("ec_remember_username", trimmedUsername);
      } else {
        localStorage.removeItem("ec_remember_username");
      }

      // Redirect to dashboard using router.replace() for smooth navigation
      // The session cookie is already set, no need for full page reload
      const redirectTo = searchParams?.get("redirect") || "/vehicles";
      console.log("[LOGIN] Redirecting to:", redirectTo);
      
      // Prevent double navigation
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        // Small delay to ensure cookie is fully processed by browser
        setTimeout(() => {
          router.replace(redirectTo);
        }, 100);
      }
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login error";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 relative">
      {/* Theme Toggle in top right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-emerald-400/20 via-emerald-500/10 to-transparent rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-red-400/15 via-red-500/10 to-transparent rounded-full blur-3xl animate-float-slow-reverse" />
      </div>

      <div className="w-full max-w-[400px] relative z-10">
        {/* Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-2xl">
          
          {/* Header */}
          <div className="relative h-32 bg-gradient-to-r from-emerald-600 to-emerald-500 overflow-visible">
            <div className="absolute inset-0 bg-gradient-to-t from-white/90 dark:from-gray-800/90 to-transparent" />
            
            {/* Logo */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-700 shadow-xl flex items-center justify-center p-2">
                <img
                  src="/logo.png"
                  alt="Emerald Cash"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="pt-10 pb-6 px-6">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Emerald Cash
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                Vehicle Management System
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" x2="22" y1="2" y2="22" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
              </label>

              {/* Success message */}
              {success && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm text-center">
                  {success}
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              {/* Submit */}
              <GlassButton
                type="submit"
                disabled={loading}
                variant="primary"
                fullWidth
                isLoading={loading}
                className="!py-3"
              >
                {loading ? "Signing in..." : "Sign In"}
              </GlassButton>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-xs text-gray-500">© 2024 Emerald Cash</p>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes ec-float-slow {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(20px, -20px, 0) scale(1.05); }
        }
        @keyframes ec-float-slow-reverse {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-20px, 20px, 0) scale(1.03); }
        }
        .animate-float-slow { animation: ec-float-slow 20s ease-in-out infinite; }
        .animate-float-slow-reverse { animation: ec-float-slow-reverse 25s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="w-full max-w-[400px]">
          <div className="relative overflow-hidden rounded-3xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-2xl p-8">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
