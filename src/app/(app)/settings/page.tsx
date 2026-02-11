import Link from "next/link";

export default function SettingsPage() {
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
