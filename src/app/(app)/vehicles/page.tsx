"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import VehicleList from "@/app/components/VehicleList";

export default function VehiclesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center py-10 text-gray-700">Loading...</div>
        </div>
      }
    >
      <VehiclesPageInner />
    </Suspense>
  );
}

function VehiclesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category") || "";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">{category ? `${category}` : "All Vehicles"}</h1>
        {category && (
          <button
            onClick={() => {
              router.push("/vehicles");
            }}
            className="ec-glassBtn px-4 py-2 rounded-xl ring-1 ring-black/10 transition font-semibold"
          >
            Clear Filter
          </button>
        )}
      </div>
      <VehicleList category={category} />
    </div>
  );
}
