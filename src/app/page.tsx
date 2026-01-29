"use client";

import AppShell from "./components/AppShell";
import { useAuthUser } from "./components/AuthContext";

export default function Home() {
  return (
    <AppShell>
      <DashboardInner />
    </AppShell>
  );
}

function DashboardInner() {
  const user = useAuthUser();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5 ec-glassPanel">
        <div className="bg-gradient-to-r from-green-800/95 via-green-700/95 to-green-600/95 px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
              <p className="text-green-50/90 mt-1 text-sm">
                Welcome, <span className="font-semibold text-white">{user.username}</span> • Role:{" "}
                <span className="font-semibold text-white">{user.role}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
