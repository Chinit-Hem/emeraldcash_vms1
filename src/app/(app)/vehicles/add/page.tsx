"use client";

import { useAuthUser } from "@/app/components/AuthContext";
import ImageZoom from "@/app/components/ImageZoom";
import { getCambodiaNowString } from "@/lib/cambodiaTime";
import { compressImage, formatFileSize } from "@/lib/compressImage";
import { derivePrices } from "@/lib/pricing";
import {
  COLOR_OPTIONS,
  PLATE_NUMBER_HINTS,
  PLATE_NUMBER_MAX_LENGTH,
  TAX_TYPE_METADATA,
  type Vehicle,
} from "@/lib/types";
import { refreshVehicleCache } from "@/lib/vehicleCache";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState, type FormEvent, type ChangeEvent, type DragEvent } from "react";

const ADD_DRAFT_KEY = "vms.addVehicleDraft.v1";

// ============================================
// Types & Interfaces
// ============================================
interface FormErrors {
  [key: string]: string;
}

interface CompressedImageData {
  file: File;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
}

// ============================================
// Form Section Component - Enterprise Grade
// ============================================
function FormSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-5 ${className}`}>
      <div className="flex items-center gap-3 pb-3 border-b border-white/20 dark:border-white/10">
        <div className="w-1 h-5 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-full" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
          {title}
        </h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// ============================================
// Form Field Component - Enterprise Grade
// ============================================
interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  helperText?: string;
}

function FormField({ label, htmlFor, required, error, children, helperText }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {helperText && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================
// Premium Input Component - Enterprise Grade
// ============================================
interface PremiumInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const PremiumInput = React.forwardRef<HTMLInputElement, PremiumInputProps>(
  ({ className = "", error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`
          w-full h-11 px-4 rounded-xl
          bg-white/60 dark:bg-slate-800/60
          border border-white/30 dark:border-white/15
          text-gray-900 dark:text-white text-sm
          placeholder:text-gray-400 dark:placeholder:text-gray-500
          shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/50
          hover:bg-white/70 dark:hover:bg-slate-800/70
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error 
            ? "border-red-400/60 ring-2 ring-red-400/40 bg-red-500/5 dark:bg-red-500/10" 
            : ""
          }
          ${className}
        `}
        {...props}
      />
    );
  }
);
PremiumInput.displayName = "PremiumInput";

// ============================================
// Premium Select Component - Enterprise Grade
// ============================================
interface PremiumSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

const PremiumSelect = React.forwardRef<HTMLSelectElement, PremiumSelectProps>(
  ({ className = "", error, children, ...props }, ref) => {
    return (
      <div className="relative group">
        <select
          ref={ref}
          className={`
            w-full h-11 px-4 pr-10 rounded-xl appearance-none
            bg-white/60 dark:bg-slate-800/60
            border border-white/30 dark:border-white/15
            text-gray-900 dark:text-white text-sm
            shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]
            transition-all duration-200 ease-out
            focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/50
            hover:bg-white/70 dark:hover:bg-slate-800/70
            cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error 
              ? "border-red-400/60 ring-2 ring-red-400/40 bg-red-500/5 dark:bg-red-500/10" 
              : ""
            }
            ${className}
          `}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-emerald-500 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    );
  }
);
PremiumSelect.displayName = "PremiumSelect";

// ============================================
// Image Dropzone Component - Enterprise Grade
// ============================================
interface ImageDropzoneProps {
  onFileSelect: (file: File | null) => void;
  isLoading: boolean;
  compressedImage: CompressedImageData | null;
  currentImage: string;
  onClear: () => void;
}

function ImageDropzone({
  onFileSelect,
  isLoading,
  compressedImage,
  currentImage,
  onClear,
}: ImageDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith("image/")) {
      return "Please select an image file (JPEG, PNG, WebP)";
    }
    if (file.size > 10 * 1024 * 1024) {
      return "Image too large. Maximum size is 10MB.";
    }
    return null;
  };

  const handleFileChange = (file: File | null) => {
    setFileError(null);
    if (!file) return;
    
    const error = validateFile(file);
    if (error) {
      setFileError(error);
      return;
    }
    
    onFileSelect(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileChange(file || null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const hasImage = currentImage && currentImage.trim() !== "";

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-xl p-6
          transition-all duration-200 cursor-pointer
          ${isDragOver 
            ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20" 
            : "border-white/40 dark:border-white/20 bg-white/40 dark:bg-slate-800/40 hover:border-emerald-300/60 dark:hover:border-emerald-500/40"
          }
        `}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            fileInputRef.current?.click();
          }
        }}
        aria-label="Drop image here or click to browse"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          className="hidden"
          aria-hidden="true"
        />
        
        <div className="flex flex-col items-center gap-3 text-center">
          <div className={`
            w-12 h-12 rounded-xl flex items-center justify-center
            ${isDragOver 
              ? "bg-emerald-100 dark:bg-emerald-500/20" 
              : "bg-white/70 dark:bg-slate-700/50"
            }
            transition-colors
          `}>
            <svg 
              className={`w-6 h-6 ${isDragOver ? "text-emerald-500" : "text-gray-400 dark:text-gray-500"}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {isLoading ? "Processing..." : "Drop image or click to browse"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              JPEG, PNG, WebP • Max 10MB
            </p>
          </div>
          
          {!isLoading && !hasImage && (
            <button
              type="button"
              className="mt-1 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-white/80 dark:bg-slate-700/50 border border-emerald-200/50 dark:border-emerald-500/30 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Choose File
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {fileError && (
        <p className="text-sm text-red-500 dark:text-red-400 flex items-center gap-1.5">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {fileError}
        </p>
      )}

      {/* Compression Info */}
      {compressedImage && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-900/30 border border-emerald-200/50 dark:border-emerald-500/20 rounded-lg px-3 py-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>
            Compressed: {formatFileSize(compressedImage.compressedSize)} 
            <span className="text-gray-500 dark:text-gray-400 ml-1">
              (was {formatFileSize(compressedImage.originalSize)})
            </span>
          </span>
        </div>
      )}

      {/* Image Preview */}
      {hasImage && (
        <div className="relative rounded-xl overflow-hidden border border-white/30 dark:border-white/10">
          <div className="aspect-video relative bg-gray-100 dark:bg-slate-800">
            <ImageZoom src={currentImage} alt="Vehicle preview" />
          </div>
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 p-2 bg-white/90 dark:bg-slate-900/90 hover:bg-red-50 dark:hover:bg-red-900/50 text-gray-600 dark:text-gray-300 hover:text-red-500 rounded-lg transition-colors shadow-sm"
            aria-label="Remove image"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Component - Enterprise Grade
// ============================================
export default function AddVehiclePage() {
  return <AddVehicleInner />;
}

function AddVehicleInner() {
  const router = useRouter();
  const user = useAuthUser();
  const isAdmin = user.role === "Admin";

  // Form state
  const [formData, setFormData] = useState<Partial<Vehicle>>({
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
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [imageLoading, setImageLoading] = useState(false);
  const [compressedImage, setCompressedImage] = useState<CompressedImageData | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load draft on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(ADD_DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") return;
      setFormData((prev) => ({ ...prev, ...(parsed as Partial<Vehicle>) }));
    } catch {
      // ignore invalid draft
    }
  }, []);

  // Save draft on change
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const draft: Partial<Vehicle> = { ...formData };
        if (typeof draft.Image === "string" && draft.Image.trim().startsWith("data:")) {
          draft.Image = "";
        }
        sessionStorage.setItem(ADD_DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // ignore storage errors
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [formData]);

  // Validation
  const validateField = useCallback((field: keyof Vehicle, value: unknown): string | undefined => {
    switch (field) {
      case "Category":
        if (!value || (typeof value === "string" && !value.trim())) {
          return "Category is required";
        }
        break;
      case "Brand":
        if (!value || (typeof value === "string" && !value.trim())) {
          return "Brand is required";
        }
        if (typeof value === "string" && value.length > 100) {
          return "Brand must be less than 100 characters";
        }
        break;
      case "Model":
        if (!value || (typeof value === "string" && !value.trim())) {
          return "Model is required";
        }
        if (typeof value === "string" && value.length > 100) {
          return "Model must be less than 100 characters";
        }
        break;
      case "Plate":
        if (typeof value === "string" && value.length > PLATE_NUMBER_MAX_LENGTH) {
          return `Plate number must be less than ${PLATE_NUMBER_MAX_LENGTH} characters`;
        }
        break;
      case "Year":
        if (value !== null && value !== undefined && value !== "") {
          const year = typeof value === "number" ? value : parseInt(String(value), 10);
          if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
            return `Year must be between 1900 and ${new Date().getFullYear() + 1}`;
          }
        }
        break;
      case "PriceNew":
        if (value !== null && value !== undefined && value !== "") {
          const price = typeof value === "number" ? value : parseFloat(String(value));
          if (isNaN(price) || price < 0) {
            return "Price must be a positive number";
          }
        }
        break;
    }
    return undefined;
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    const requiredFields: (keyof Vehicle)[] = ["Category", "Brand", "Model"];
    
    requiredFields.forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    // Validate optional fields if they have values
    const optionalFields: (keyof Vehicle)[] = ["Plate", "Year", "PriceNew"];
    optionalFields.forEach((field) => {
      const value = formData[field];
      if (value !== null && value !== undefined && value !== "") {
        const error = validateField(field, value);
        if (error) {
          newErrors[field] = error;
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [formData, validateField]);

  // Handlers
  const handleChange = (field: keyof Vehicle, value: string | number | boolean | null) => {
    setFormData((prev) => {
      const next: Partial<Vehicle> = { ...prev, [field]: value };
      if (field === "PriceNew") {
        const rawValue = typeof value === "number" ? value : (typeof value === "string" ? Number.parseFloat(value) : NaN);
        const priceNew = Number.isFinite(rawValue) && rawValue > 0 ? rawValue : null;
        const derived = derivePrices(priceNew);
        next.PriceNew = priceNew;
        next.Price40 = derived.Price40;
        next.Price70 = derived.Price70;
      }
      return next;
    });

    // Clear error when field is modified
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleBlur = (field: keyof Vehicle) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleImageFile = async (file: File | null) => {
    if (!file) return;

    setImageLoading(true);
    try {
      const result = await compressImage(file, {
        maxWidth: 1280,
        quality: 0.75,
        targetMinSizeKB: 250,
        targetMaxSizeKB: 800,
      });

      setCompressedImage({
        file: result.file,
        dataUrl: result.dataUrl,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
      });

      handleChange("Image", result.dataUrl);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        Image: err instanceof Error ? err.message : "Failed to process image",
      }));
    } finally {
      setImageLoading(false);
    }
  };

  const handleClearImage = () => {
    setCompressedImage(null);
    handleChange("Image", "");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach((key) => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = document.querySelector("[aria-invalid='true']");
      firstErrorField?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);

    const currentFormData = { ...formData };
    const currentCompressedImage = compressedImage;

    try {
      const formDataToSend = new FormData();

      Object.entries(currentFormData).forEach(([key, value]) => {
        if (value != null) {
          formDataToSend.append(key, String(value));
        }
      });
      formDataToSend.append("Time", getCambodiaNowString());

      if (currentCompressedImage?.file) {
        formDataToSend.append("image", currentCompressedImage.file);
      }

      const res = await fetch("/api/vehicles", {
        method: "POST",
        body: formDataToSend,
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const json = await res.json().catch(() => ({}));
      if (res.status === 403) throw new Error("Forbidden");
      if (!res.ok || json.ok === false) throw new Error(json.error || "Failed to add vehicle");

      // Success: reset form and show success message
      try {
        sessionStorage.removeItem(ADD_DRAFT_KEY);
      } catch {
        // ignore
      }

      setSuccessMessage("Vehicle added successfully!");
      setFormData({
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
      });
      setCompressedImage(null);
      setTouched({});
      setErrors({});

      refreshVehicleCache();
      
      // Trigger Next.js router refresh to update all components with fresh data
      router.refresh();

    } catch (err) {

      setErrors((prev) => ({
        ...prev,
        submit: err instanceof Error ? err.message : "Failed to add vehicle. Please try again.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Static data
  const categories = ["Cars", "Motorcycles", "Tuk Tuk"];
  const conditions = ["New", "Used", "Damaged"];
  const bodyTypes = ["Sedan", "SUV", "Truck", "Van", "Bike", "Other"];

  // Non-admin view
  if (!isAdmin) {
    return (
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
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 pb-32 sm:pb-8 bg-gradient-to-br from-gray-50/50 to-gray-100/50 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-5xl mx-auto">
        {/* Premium Liquid Glass Card */}
        <div className="relative rounded-2xl bg-gradient-to-br from-white/70 via-emerald-100/20 via-red-50/10 via-emerald-50/15 to-white/70 dark:from-white/8 dark:via-emerald-500/15 dark:via-red-900/8 dark:via-emerald-900/12 dark:to-white/8 backdrop-blur-xl border border-white/15 dark:border-white/15 shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-white/20 dark:border-white/10 bg-white/50 dark:bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  Add New Vehicle
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Enter the vehicle details below. Required fields marked with *
                </p>
              </div>
              <button
                onClick={() => router.back()}
                className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-white/30 dark:border-white/10 transition-all hover:scale-105 active:scale-95"
                aria-label="Close"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mx-6 sm:mx-8 mt-6 p-4 bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-emerald-800 dark:text-emerald-300 font-medium">{successMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMessage("")}
                className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-lg transition-colors"
                aria-label="Dismiss success message"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Error Message */}
          {errors.submit && (
            <div className="mx-6 sm:mx-8 mt-6 p-4 bg-red-50/80 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/20 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-red-800 dark:text-red-300 font-medium">{errors.submit}</span>
            </div>
          )}

          {/* Form Content - Scrollable Area */}
          <div className="p-6 sm:p-8 max-h-[calc(100vh-420px)] overflow-y-auto pb-32">
            <form id="add-vehicle-form" onSubmit={handleSubmit} className="space-y-8">
              {/* Section A: Basic Information */}
              <FormSection title="Basic Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField
                    label="Category"
                    htmlFor="category"
                    required
                    error={touched.Category ? errors.Category : undefined}
                  >
                    <PremiumSelect
                      id="category"
                      required
                      autoFocus
                      value={formData.Category || ""}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => handleChange("Category", e.target.value)}
                      onBlur={() => handleBlur("Category")}
                      error={!!(touched.Category && errors.Category)}
                      aria-invalid={!!(touched.Category && errors.Category)}
                    >
                      <option value="" disabled>Select category</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </PremiumSelect>
                  </FormField>

                  <FormField
                    label="Brand"
                    htmlFor="brand"
                    required
                    error={touched.Brand ? errors.Brand : undefined}
                  >
                    <PremiumInput
                      id="brand"
                      type="text"
                      required
                      maxLength={100}
                      value={formData.Brand || ""}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("Brand", e.target.value)}
                      onBlur={() => handleBlur("Brand")}
                      placeholder="e.g., Toyota, Honda, Ford"
                      error={!!(touched.Brand && errors.Brand)}
                      aria-invalid={!!(touched.Brand && errors.Brand)}
                    />
                  </FormField>

                  <FormField
                    label="Model"
                    htmlFor="model"
                    required
                    error={touched.Model ? errors.Model : undefined}
                  >
                    <PremiumInput
                      id="model"
                      type="text"
                      required
                      maxLength={100}
                      value={formData.Model || ""}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("Model", e.target.value)}
                      onBlur={() => handleBlur("Model")}
                      placeholder="e.g., Camry, Civic, F-150"
                      error={!!(touched.Model && errors.Model)}
                      aria-invalid={!!(touched.Model && errors.Model)}
                    />
                  </FormField>

                  <FormField
                    label="Plate Number"
                    htmlFor="plate"
                    error={touched.Plate ? errors.Plate : undefined}
                    helperText={`Format: ${PLATE_NUMBER_HINTS[0]}`}
                  >
                    <PremiumInput
                      id="plate"
                      type="text"
                      maxLength={PLATE_NUMBER_MAX_LENGTH}
                      value={formData.Plate || ""}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("Plate", e.target.value.toUpperCase())}
                      onBlur={() => handleBlur("Plate")}
                      placeholder={`e.g., ${PLATE_NUMBER_HINTS[0]}`}
                      className="font-mono uppercase placeholder:normal-case"
                      error={!!(touched.Plate && errors.Plate)}
                      aria-invalid={!!(touched.Plate && errors.Plate)}
                    />
                  </FormField>

                  <FormField
                    label="Year"
                    htmlFor="year"
                    error={touched.Year ? errors.Year : undefined}
                  >
                    <PremiumInput
                      id="year"
                      type="number"
                      min={1900}
                      max={new Date().getFullYear() + 1}
                      value={formData.Year ?? ""}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        handleChange(
                          "Year",
                          e.target.value === ""
                            ? null
                            : Number.isNaN(Number.parseInt(e.target.value, 10))
                              ? null
                              : Number.parseInt(e.target.value, 10)
                        )
                      }
                      onBlur={() => handleBlur("Year")}
                      placeholder="e.g., 2024"
                      error={!!(touched.Year && errors.Year)}
                      aria-invalid={!!(touched.Year && errors.Year)}
                    />
                  </FormField>
                </div>
              </FormSection>

              {/* Section B: Specifications */}
              <FormSection title="Specifications">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField
                    label="Color"
                    htmlFor="color"
                    helperText="Select or type a custom color"
                  >
                    <div className="relative">
                      <PremiumInput
                        id="color"
                        type="text"
                        list="colorsList"
                        value={formData.Color || ""}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("Color", e.target.value)}
                        placeholder="Type or select color"
                      />
                      <datalist id="colorsList">
                        {COLOR_OPTIONS.map((color) => (
                          <option key={color.value} value={color.value} />
                        ))}
                      </datalist>
                    </div>
                    {formData.Color && (
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className="w-5 h-5 rounded border border-gray-300 dark:border-gray-600 shadow-sm"
                          style={{ 
                            backgroundColor: COLOR_OPTIONS.find(c => c.value === formData.Color)?.hex || formData.Color 
                          }}
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{formData.Color}</span>
                      </div>
                    )}
                  </FormField>

                  <FormField label="Condition" htmlFor="condition">
                    <PremiumSelect
                      id="condition"
                      value={formData.Condition || "New"}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => handleChange("Condition", e.target.value)}
                    >
                      {conditions.map((cond) => (
                        <option key={cond} value={cond}>{cond}</option>
                      ))}
                    </PremiumSelect>
                  </FormField>

                  <FormField
                    label="Body Type"
                    htmlFor="bodyType"
                    helperText="Select or type a custom body type"
                  >
                    <div className="relative">
                      <PremiumInput
                        id="bodyType"
                        type="text"
                        list="bodyTypesList"
                        value={formData.BodyType || ""}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("BodyType", e.target.value)}
                        placeholder="Type or select body type"
                      />
                      <datalist id="bodyTypesList">
                        {bodyTypes.map((bt) => (
                          <option key={bt} value={bt} />
                        ))}
                      </datalist>
                    </div>
                  </FormField>

                  <FormField label="Tax Type" htmlFor="taxType">
                    <PremiumSelect
                      id="taxType"
                      value={formData.TaxType || ""}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => handleChange("TaxType", e.target.value)}
                    >
                      <option value="">Select tax type</option>
                      {Object.entries(TAX_TYPE_METADATA).map(([key, meta]) => (
                        <option key={key} value={key}>{meta.label}</option>
                      ))}
                    </PremiumSelect>
                  </FormField>
                </div>
              </FormSection>

              {/* Section C: Pricing */}
              <FormSection title="Pricing">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <FormField
                    label="Market Price"
                    htmlFor="priceNew"
                    error={touched.PriceNew ? errors.PriceNew : undefined}
                    helperText="Enter the market price in USD"
                  >
                    <PremiumInput
                      id="priceNew"
                      type="number"
                      min={0}
                      step="0.01"
                      value={formData.PriceNew ?? ""}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        handleChange(
                          "PriceNew",
                          e.target.value === ""
                            ? null
                            : Number.parseFloat(e.target.value)
                        )
                      }
                      onBlur={() => handleBlur("PriceNew")}
                      placeholder="0.00"
                      error={!!(touched.PriceNew && errors.PriceNew)}
                      aria-invalid={!!(touched.PriceNew && errors.PriceNew)}
                    />
                  </FormField>

                  <FormField
                    label="D.O.C. 40%"
                    htmlFor="price40"
                    helperText="Auto-calculated from market price"
                  >
                    <div className="relative">
                      <PremiumInput
                        id="price40"
                        type="number"
                        readOnly
                        value={formData.Price40 ?? ""}
                        className="bg-emerald-50/30 dark:bg-emerald-900/10 cursor-not-allowed"
                        disabled
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded">
                        AUTO
                      </span>
                    </div>
                  </FormField>

                  <FormField
                    label="Vehicles 70%"
                    htmlFor="price70"
                    helperText="Auto-calculated from market price"
                  >
                    <div className="relative">
                      <PremiumInput
                        id="price70"
                        type="number"
                        readOnly
                        value={formData.Price70 ?? ""}
                        className="bg-emerald-50/30 dark:bg-emerald-900/10 cursor-not-allowed"
                        disabled
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded">
                        AUTO
                      </span>
                    </div>
                  </FormField>
                </div>
              </FormSection>

              {/* Section D: Images */}
              <FormSection title="Vehicle Images">
                <div className="grid grid-cols-1 gap-5">
                  <FormField
                    label="Upload Image"
                    htmlFor="imageUpload"
                    helperText="Drag and drop or click to browse"
                  >
                    <ImageDropzone
                      onFileSelect={handleImageFile}
                      isLoading={imageLoading}
                      compressedImage={compressedImage}
                      currentImage={formData.Image || ""}
                      onClear={handleClearImage}
                    />
                  </FormField>

                  {/* Alternative: Image URL */}
                  {!compressedImage && !formData.Image && (
                    <FormField
                      label="Or enter Image URL"
                      htmlFor="imageUrl"
                      helperText="Paste a direct image link"
                    >
                      <PremiumInput
                        id="imageUrl"
                        type="url"
                        value={formData.Image || ""}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("Image", e.target.value)}
                        placeholder="https://example.com/image.jpg"
                      />
                    </FormField>
                  )}
                </div>
              </FormSection>
            </form>
          </div>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 left-0 right-0 p-4 sm:p-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border-t border-white/20 dark:border-white/10">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 rounded-xl bg-white/70 dark:bg-slate-700/70 border border-white/30 dark:border-white/10 text-gray-700 dark:text-gray-300 font-medium hover:bg-white/90 dark:hover:bg-slate-600/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-vehicle-form"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-medium hover:from-emerald-700 hover:to-emerald-600 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Adding...</span>
                  </>
                ) : (
                  "Add Vehicle"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
