"use client";

import { useAuthUser } from "@/app/components/AuthContext";
import { VehicleForm } from "@/app/components/vehicles/VehicleForm";
import { useAddVehicleOptimistic } from "@/app/components/vehicles/useAddVehicleOptimistic";
import { GlassToast, useToast } from "@/app/components/ui/GlassToast";
import type { Vehicle } from "@/lib/types";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function AddVehiclePage() {
  const router = useRouter();
  const user = useAuthUser();
  const isAdmin = user.role === "Admin";
  const { toasts, removeToast, success: showSuccessToast, error: showErrorToast } = useToast();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Use optimistic add hook for instant feedback
  const { addVehicle, isProcessing } = useAddVehicleOptimistic({
    onSuccess: (vehicle) => {
      console.log("[AddVehiclePage] Vehicle added successfully:", vehicle.VehicleId);
      // Show success toast
      showSuccessToast("Vehicle added successfully!", 2000);
    },
    onError: (error) => {
      console.error("[AddVehiclePage] Failed to add vehicle:", error);
      const message = error instanceof Error ? error.message : "Failed to add vehicle. Please try again.";
      setSubmitError(message);
      showErrorToast(message, 4500);
    },
  });

  // Empty vehicle template for adding new vehicle
  const emptyVehicle: Vehicle = {
    VehicleId: "",
    Brand: "",
    Model: "",
    Category: "",
    Plate: "",
    Year: null,
    Color: "",
    Condition: "New",
    BodyType: "",
    TaxType: "",
    PriceNew: null,
    Price40: null,
    Price70: null,
    Image: "",
    Time: "",
  };

  const handleSubmit = async (formData: Partial<Vehicle>, image: File | string | null) => {
    setSubmitError(null);
    setIsNavigating(true);

    try {
      // Convert image to File if it's a string (URL or base64 not supported for add)
      let imageFile: File | null = null;
      if (image instanceof File) {
        imageFile = image;
      }

      // Use optimistic add - shows success immediately, processes in background
      await addVehicle(formData, imageFile);

      // Navigate immediately - don't wait for background processing
      router.push("/vehicles");
      
    } catch (err) {
      // Error is handled by onError callback in the hook
      setIsNavigating(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  // Non-admin view
  if (!isAdmin) {
    return (
      <>
        <GlassToast toasts={toasts} onRemove={removeToast} />
        <div className="min-h-screen p-4 sm:p-6 lg:p-8 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
          <div className="max-w-md w-full p-8 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Only administrators can add vehicles to the system.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => router.back()}
                  className="flex-1 px-6 py-3 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-white/30 dark:border-white/10 text-gray-700 dark:text-gray-300 font-medium hover:bg-white/90 dark:hover:bg-slate-700/90 transition-all"
                >
                  Go Back
                </button>
                <button
                  onClick={() => router.push("/vehicles")}
                  className="flex-1 px-6 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                >
                  View Vehicles
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <GlassToast toasts={toasts} onRemove={removeToast} />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 p-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Vehicle</h1>
            <p className="text-gray-500 dark:text-gray-400">Enter the vehicle details below</p>
          </div>

          {/* Form Card */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-white/10 shadow-xl overflow-hidden">
            <VehicleForm
              vehicle={emptyVehicle}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isNavigating || isProcessing}
              submitError={submitError}
              onClearError={() => setSubmitError(null)}
              isModal={false}
              modalTitle="Add New Vehicle"
            />
          </div>
        </div>
      </div>
    </>
  );
}
