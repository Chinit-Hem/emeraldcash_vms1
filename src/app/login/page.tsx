"use client";

import React, { Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "@/app/components/ThemeToggle";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        // Ensure cookies are sent and received properly on mobile
        credentials: "same-origin",
      });

      const json = await res.json();
      if (!res.ok || json.ok === false)
        throw new Error(json.error || "Login failed");

      // Add a small delay to ensure cookie is set before redirect
      await new Promise(resolve => setTimeout(resolve, 100));

      const redirectTo = searchParams?.get("redirect") || "/";
      router.push(redirectTo);
      // Force a page reload to ensure session is recognized
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ec-shell">
      <section className="ec-card ec-authCard">
        <div className="ec-brandRow">
          <Image
            src="/logo.png"
            alt="Emerald Cash"
            width={48}
            height={48}
            className="h-12 w-12 object-contain"
            priority
          />
          <div className="min-w-0 flex-1">
            <h1 className="ec-title">Emerald Cash</h1>
            <p className="ec-subtitle">Sign in to view and manage vehicle data.</p>
          </div>
          <ThemeToggle />
        </div>

        <form onSubmit={onSubmit} className="ec-form">
          <input
            className="ec-input"
            value={username}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            required
          />
          <div className="relative">
            <input
              className="ec-input w-full pr-10"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                  <line x1="2" x2="22" y1="2" y2="22" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          <button className="ec-btn ec-btnPrimary" disabled={loading} type="submit">
            {loading ? "Signing in..." : "Sign in"}
          </button>

          {error ? <div className="ec-error">{error}</div> : null}
        </form>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="ec-shell">Loading...</main>}>
      <LoginForm />
    </Suspense>
  );
}
