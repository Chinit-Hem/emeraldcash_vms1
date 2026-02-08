"use client";

import { GlassButton } from "@/app/components/ui/GlassButton";
import type { Vehicle } from "@/lib/types";
import { useState } from "react";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  vehicle: Vehicle | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  vehicle,
  onClose,
  onConfirm,
  isDeleting: externalIsDeleting,
}: DeleteConfirmationModalProps) {
  const [internalIsDeleting, setInternalIsDeleting] = useState(false);
  
  // Use external isDeleting if provided (optimistic UI), otherwise use internal state
  const isDeleting = externalIsDeleting !== undefined ? externalIsDeleting : internalIsDeleting;

  const handleConfirm = async () => {
    // Only manage internal state if no external control
    if (externalIsDeleting === undefined) {
      setInternalIsDeleting(true);
    }
    try {
      await onConfirm();
    } finally {
      if (externalIsDeleting === undefined) {
        setInternalIsDeleting(false);
      }
    }
  };


  if (!isOpen || !vehicle) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="ec-glassCard w-full max-w-md p-6 rounded-2xl">
        {/* Icon and Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-red-600 dark:text-red-400"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Delete Vehicle
          </h3>
        </div>

        {/* Vehicle Info */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <p className="font-medium text-gray-900 dark:text-white">
            {vehicle.Brand} {vehicle.Model}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {vehicle.Year || "-"} • {vehicle.Category} • Plate: {vehicle.Plate || "-"}
          </p>
        </div>

        {/* Warning Message */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete this vehicle? This action cannot be undone and the vehicle data will be permanently removed from the system.
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <GlassButton variant="ghost" onClick={onClose} disabled={isDeleting}>
            Cancel
          </GlassButton>
          <GlassButton
            variant="danger"
            onClick={handleConfirm}
            isLoading={isDeleting}
          >
            Delete Vehicle
          </GlassButton>
        </div>
      </div>
    </div>
  );
}
