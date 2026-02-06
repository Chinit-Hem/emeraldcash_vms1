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
          <input
            className="ec-input"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            autoComplete="current-password"
            required
          />

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
