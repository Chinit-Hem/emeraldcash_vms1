"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthUser } from "@/app/components/AuthContext";
import { useToast } from "@/app/components/ui/GlassToast";
import { GlassCard } from "@/app/components/ui/GlassCard";
import { GlassButton } from "@/app/components/ui/GlassButton";
import { CardSkeleton } from "@/app/components/LoadingSkeleton";
import { VehicleForm } from "@/app/components/vehicles/VehicleForm";
import { ConfirmDeleteModal } from "@/app/components/vehicles/ConfirmDeleteModal";
import { useVehicle } from "@/app/components/vehicles/useVehicle";
import { useUpdateVehicle } from "@/app/components/vehicles/useUpdateVehicle";
import { useDeleteVehicle } from "@/app/components/vehicles/useDeleteVehicle";
import { formatVehicleId, formatVehicleTime } from "@/lib/format";
import type { Vehicle } from "@/lib/types";

export default function EditVehiclePage() {
  return <EditVehicleInner />;
}

function EditVehicleInner() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const user = useAuthUser();
  const { success, error: showError } = useToast();
  
  const isAdmin = user?.role === "Admin";
  const userRole = user?.role || "Viewer";

  // Local state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Hooks
  const { vehicle, loading, error: fetchError, refetch } = useVehicle(id);
  
  const handleUpdateSuccess = useCallback(() => {
    success("Vehicle updated successfully");
    router.push(`/vehicles/${id}/view`);
  }, [success, router, id]);

  const handleUpdateError = useCallback((err: string) => {
    showError(err);
    setSubmitError(err);
  }, [showError]);

  const { updateVehicle, isUpdating } = useUpdateVehicle(
    handleUpdateSuccess,
    handleUpdateError
  );

  const handleDeleteSuccess = useCallback(() => {
    success("Vehicle deleted successfully");
    setIsDeleteModalOpen(false);
    router.push("/vehicles");
  }, [success, router]);

  const handleDeleteError = useCallback((err: string) => {
    showError(err);
  }, [showError]);

  const { deleteVehicle, isDeleting } = useDeleteVehicle(
    handleDeleteSuccess,
    handleDeleteError
  );

  // Handle form submission
  const handleSubmit = useCallback(async (formData: Partial<Vehicle>, imageFile: File | null) => {
    if (!vehicle) return;
    
    setSubmitError(null);
    
    const updateData = {
      ...formData,
      VehicleId: vehicle.VehicleId,
    };
    
    await updateVehicle(updateData, imageFile);
  }, [vehicle, updateVehicle]);

  // Handle cancel with unsaved changes warning
  const handleCancel = useCallback(() => {
    router.push(`/vehicles/${id}/view`);
  }, [router, id]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!vehicle) return;
    await deleteVehicle(vehicle);
  }, [vehicle, deleteVehicle]);

  // Clear submit error
  const handleClearError = useCallback(() => {
    setSubmitError(null);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <CardSkeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <GlassCard variant="elevated" className="p-8 text-center">
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
                <path d="m15 9-6 6" />
                <path d="m9 9 6 6" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Error Loading Vehicle
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{fetchError}</p>
            <div className="flex gap-3 justify-center">
              <GlassButton onClick={() => refetch()} variant="primary">
                Retry
              </GlassButton>
              <GlassButton onClick={() => router.push("/vehicles")} variant="secondary">
                Back to List
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  // Not found state
  if (!vehicle) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <GlassCard variant="elevated" className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 text-gray-400"
              >
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <path d="M9 17h6" />
                <circle cx="17" cy="17" r="2" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Vehicle Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The vehicle you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <GlassButton onClick={() => router.push("/vehicles")} variant="primary">
              Back to Vehicles
            </GlassButton>
          </GlassCard>
        </div>
      </div>
    );
  }

  // Permission check
  if (!isAdmin) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <GlassCard variant="elevated" className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 text-amber-600"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                <path d="M8 11h8" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Only Admin can edit vehicles.
            </p>
            <div className="flex gap-3 justify-center">
              <GlassButton onClick={() => router.push("/vehicles")} variant="secondary">
                Back to List
              </GlassButton>
              <GlassButton 
                onClick={() => router.push(`/vehicles/${vehicle.VehicleId}/view`)} 
                variant="primary"
              >
                View Vehicle
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto">
        {/* Main Glass Card */}
        <GlassCard 
          variant="elevated" 
          className="overflow-hidden bg-gradient-to-br from-white/70 via-emerald-50/10 via-red-50/5 via-emerald-50/10 to-white/70 dark:from-white/8 dark:via-emerald-500/10 dark:via-red-900/5 dark:via-emerald-900/8 dark:to-white/8 border-white/20 dark:border-white/10"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <GlassButton
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  Back
                </GlassButton>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                    Edit Vehicle
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    ID: {formatVehicleId(vehicle.VehicleId)}
                  </p>
                </div>
              </div>
              
              {/* Status Chips */}
              <div className="flex items-center gap-2 flex-wrap">
                {vehicle.Category && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {vehicle.Category}
                  </span>
                )}
                {vehicle.Condition && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    {vehicle.Condition}
                  </span>
                )}
                {vehicle.Time && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                    Updated: {formatVehicleTime(vehicle.Time)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-4 md:p-6 space-y-6">
            <VehicleForm
              vehicle={vehicle}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isUpdating}
              submitError={submitError}
              onClearError={handleClearError}
            />
          </div>

          {/* Delete Section - Only for Admin */}
          <div className="px-4 md:px-6 pb-4 md:pb-6">
            <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Danger Zone
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Permanently delete this vehicle and all associated data
                  </p>
                </div>
                <GlassButton
                  variant="danger"
                  size="md"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                  Delete Vehicle
                </GlassButton>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        vehicle={vehicle}
        isOpen={isDeleteModalOpen}
        isDeleting={isDeleting}
        userRole={userRole}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
