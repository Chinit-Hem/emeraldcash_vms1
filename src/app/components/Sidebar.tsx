"use client";

import type { User } from "@/lib/types";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { clearCachedUser } from "@/app/components/authCache";
import ChangePasswordModal from "@/app/components/ChangePasswordModal";
import ThemeToggle from "@/app/components/ThemeToggle";

function normalizeCategory(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function iconClassName(active: boolean) {
  return active
    ? "h-4 w-4 text-white/90"
    : "h-4 w-4 text-gray-500 group-hover:text-gray-700 transition-colors";
}

function IconDashboard({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={iconClassName(active)}
      aria-hidden="true"
    >
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function IconVehicles({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={iconClassName(active)}
      aria-hidden="true"
    >
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}

function IconAdd({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={iconClassName(active)}
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function IconCar({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={iconClassName(active)}
      aria-hidden="true"
    >
      <path d="M7 16h10" />
      <path d="M4 12l2-5h12l2 5" />
      <path d="M6 12h12" />
      <path d="M5 16v2" />
      <path d="M19 16v2" />
      <circle cx="7.5" cy="18" r="1" />
      <circle cx="16.5" cy="18" r="1" />
    </svg>
  );
}

function IconMotorcycle({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={iconClassName(active)}
      aria-hidden="true"
    >
      <circle cx="6" cy="17" r="2" />
      <circle cx="18" cy="17" r="2" />
      <path d="M6 17h5l3-6h3" />
      <path d="M13 11l2 6" />
      <path d="M10 11l2-3h3" />
    </svg>
  );
}

function IconTukTuk({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={iconClassName(active)}
      aria-hidden="true"
    >
      <path d="M5 13V9h9l3 4v4H7" />
      <path d="M14 9V6h3v7" />
      <circle cx="7" cy="17" r="1.5" />
      <circle cx="17" cy="17" r="1.5" />
      <path d="M7 9h3v4H7z" />
    </svg>
  );
}

interface SidebarProps {
  user: User;
  onNavigate?: () => void;
}

export default function Sidebar({ user, onNavigate }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [vehiclesMenuOpen, setVehiclesMenuOpen] = useState(() => pathname.startsWith("/vehicles"));
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      clearCachedUser();
      router.push("/login");
      onNavigate?.();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const isAdmin = user.role === "Admin";

  const activeCategory = pathname === "/vehicles" ? searchParams?.get("category") || "" : "";

  const isDashboardActive = pathname === "/";
  const isVehiclesSectionActive = pathname.startsWith("/vehicles");
  const isAllVehiclesActive = pathname === "/vehicles" && !activeCategory;
  const isAddActive = pathname === "/vehicles/add";

  const navButtonClasses = useMemo(() => {
    const base =
      "group relative w-full text-left px-4 py-2 rounded-lg transition-all duration-200 font-semibold flex items-center justify-between";
    return {
      base,
      active: `${base} bg-green-700 text-white shadow-sm`,
      inactive: `${base} text-gray-800 hover:bg-gray-100 hover:translate-x-[1px]`,
      label: "relative z-10",
      activePill:
        "absolute inset-0 rounded-lg bg-gradient-to-r from-green-800 to-green-600 opacity-0 scale-[0.98] transition-all duration-200",
      activePillOn: "opacity-100 scale-100",
    };
  }, []);

  return (
    <aside className="w-64 ec-glassPanel shadow-lg ring-1 ring-black/5 print:hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Image
            src="/logo.png"
            alt="Emerald Cash"
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
            priority
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-800 leading-tight">Emerald Cash</h1>
            <p className="text-sm text-gray-600">VMS</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-2 mb-8">
          <div>
            <button
              onClick={() => {
                router.push("/");
                onNavigate?.();
              }}
              className={isDashboardActive ? navButtonClasses.active : navButtonClasses.inactive}
            >
              <span
                className={`${navButtonClasses.activePill} ${isDashboardActive ? navButtonClasses.activePillOn : ""}`}
                aria-hidden="true"
              />
                <span className={`${navButtonClasses.label} flex items-center justify-between w-full`}>
                  <span className="flex items-center gap-3">
                    <IconDashboard active={isDashboardActive} />
                    <span>Dashboard</span>
                  </span>
                </span>
            </button>
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                if (!vehiclesMenuOpen && !pathname.startsWith("/vehicles")) {
                  router.push("/vehicles");
                  onNavigate?.();
                }
                setVehiclesMenuOpen((prev) => !prev);
              }}
              className={isVehiclesSectionActive ? navButtonClasses.active : navButtonClasses.inactive}
            >
              <span
                className={`${navButtonClasses.activePill} ${
                  isVehiclesSectionActive ? navButtonClasses.activePillOn : ""
                }`}
                aria-hidden="true"
              />
              <span className={`${navButtonClasses.label} flex items-center justify-between w-full`}>
                <span className="flex items-center gap-3">
                  <IconVehicles active={isVehiclesSectionActive} />
                  <span>All Vehicles</span>
                </span>
                <span
                  className={`text-xs font-extrabold tracking-wide ${
                    isVehiclesSectionActive ? "text-white/90" : "text-gray-500"
                  }`}
                >
                  {vehiclesMenuOpen ? "Hide ▾" : "Show ▸"}
                </span>
              </span>
            </button>

            {vehiclesMenuOpen ? (
              <div className="mt-2 space-y-2">
                <button
                  onClick={() => {
                    router.push("/vehicles");
                    onNavigate?.();
                  }}
                  className={isAllVehiclesActive ? navButtonClasses.active : navButtonClasses.inactive}
                >
                  <span
                    className={`${navButtonClasses.activePill} ${
                      isAllVehiclesActive ? navButtonClasses.activePillOn : ""
                    }`}
                    aria-hidden="true"
                  />
                  <span className={`${navButtonClasses.label} flex items-center gap-3`}>
                    <IconVehicles active={isAllVehiclesActive} />
                    <span>All Vehicles</span>
                  </span>
                </button>

                {isAdmin ? (
                  <button
                    onClick={() => {
                      router.push("/vehicles/add");
                      onNavigate?.();
                    }}
                    className={isAddActive ? navButtonClasses.active : navButtonClasses.inactive}
                  >
                    <span
                      className={`${navButtonClasses.activePill} ${
                        isAddActive ? navButtonClasses.activePillOn : ""
                      }`}
                      aria-hidden="true"
                    />
                    <span className={`${navButtonClasses.label} flex items-center gap-3`}>
                      <IconAdd active={isAddActive} />
                      <span>Add Vehicle</span>
                    </span>
                  </button>
                ) : null}

                {(() => {
                  const categories = ["Cars", "Motorcycles", "Tuk Tuk"];
                  return categories.map((cat) => {
                    const isActive =
                      pathname === "/vehicles" && normalizeCategory(activeCategory) === normalizeCategory(cat);

                    const categoryNormalized = normalizeCategory(cat);
                    const icon =
                      categoryNormalized === "cars" ? (
                        <IconCar active={isActive} />
                      ) : categoryNormalized === "motorcycles" ? (
                        <IconMotorcycle active={isActive} />
                      ) : (
                        <IconTukTuk active={isActive} />
                      );

                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          router.push(`/vehicles?category=${encodeURIComponent(cat)}`);
                          onNavigate?.();
                        }}
                        className={isActive ? navButtonClasses.active : navButtonClasses.inactive}
                      >
                        <span
                          className={`${navButtonClasses.activePill} ${
                            isActive ? navButtonClasses.activePillOn : ""
                          }`}
                          aria-hidden="true"
                        />
                        <span className={`${navButtonClasses.label} flex items-center gap-3`}>
                          {icon}
                          <span>{cat === "Tuk Tuk" ? "TukTuks" : cat}</span>
                        </span>
                      </button>
                    );
                  });
                })()}
              </div>
            ) : null}
          </div>
        </nav>

        {/* Divider */}
        <div className="border-t border-gray-200 mb-6"></div>

        {/* User Info & Logout */}
        <div className="space-y-4">
          <div className="px-4 py-3 ec-glassPanelSoft rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Role:</p>
            <p className="font-semibold text-gray-800">{user.role}</p>
            <p className="text-xs text-gray-600 mt-2">User: {user.username}</p>
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="text-xs text-gray-600 font-semibold">Appearance</div>
            <ThemeToggle />
          </div>

          <button
            onClick={() => setChangePasswordOpen(true)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Change Password
          </button>

          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
          >
            Logout
          </button>
        </div>
      </div>

      <ChangePasswordModal isOpen={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </aside>
  );
}
