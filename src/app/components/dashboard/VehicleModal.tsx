"use client";

import { GlassInput } from "@/app/components/ui/GlassInput";
import { useUI } from "@/app/components/UIContext";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { COLOR_OPTIONS, TAX_TYPE_OPTIONS, type Vehicle } from "@/lib/types";
import { useEffect, useState, useCallback } from "react";

interface VehicleModalProps {
  isOpen: boolean;
  vehicle: Vehicle | null;
  onClose: () => void;
  onSave: (vehicle: Partial<Vehicle>, imageFile?: File | null) => Promise<void>;
}


const CATEGORIES = ["Cars", "Motorcycles", "Tuk Tuk"];
const CONDITIONS = ["New", "Used"];
const BODY_TYPES = ["Sedan", "SUV", "Truck", "Van", "Coupe", "Hatchback", "Convertible", "Wagon", "Pickup", "Other"];

export default function VehicleModal({ isOpen, vehicle, onClose, onSave }: VehicleModalProps) {
  const { setIsModalOpen } = useUI();
  const [formData, setFormData] = useState<Partial<Vehicle>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);

  const isEditing = !!vehicle;

  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsModalOpen(true);
      if (vehicle) {
        setFormData({ ...vehicle });
        setImagePreview(vehicle.Image || null);
        setImageUrl(vehicle.Image || "");
      } else {
        setFormData({
          Category: "Cars",
          Condition: "New",
          TaxType: "Standard",
          BodyType: "Sedan",
          Color: "White",
        });
        setImagePreview(null);
        setImageUrl("");
      }
      setImageFile(null);
      setErrors({});
    } else {
      setIsModalOpen(false);
    }
  }, [isOpen, vehicle, setIsModalOpen]);

  const handleChange = (field: keyof Vehicle, value: string | number | null) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      
      // Auto-calculate derived prices when Market Price changes
      if (field === "PriceNew" && typeof value === "number" && value > 0) {
        newData.Price40 = Math.round(value * 0.4 * 100) / 100;
        newData.Price70 = Math.round(value * 0.7 * 100) / 100;
      }
      
      return newData;
    });
    
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleImageUrlChange = (url: string) => {
    setImageUrl(url);
    if (url.trim()) {
      setImagePreview(url);
      handleChange("Image", url);
    } else {
      setImagePreview(null);
      handleChange("Image", "");
    }
  };

  const handleFileSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, Image: "File size must be less than 10MB" }));
      return;
    }
    
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, Image: "Please select an image file (JPEG, PNG, WebP)" }));
      return;
    }

    setImageFile(file);
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.Image;
      return newErrors;
    });
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      handleChange("Image", result);
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl("");
    handleChange("Image", "");
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.Category) {
      newErrors.Category = "Category is required";
    }
    if (!formData.Brand?.trim()) {
      newErrors.Brand = "Brand is required";
    }
    if (!formData.Model?.trim()) {
      newErrors.Model = "Model is required";
    }
    if (formData.Plate?.trim()) {
      // Validate plate format (e.g., 1A-1234)
      const platePattern = /^[0-9]{1,2}[A-Z]-[0-9]{4}$/;
      if (!platePattern.test(formData.Plate.trim())) {
        newErrors.Plate = "Format: 1A-1234";
      }
    }
    if (formData.Year && (formData.Year < 1900 || formData.Year > new Date().getFullYear() + 1)) {
      newErrors.Year = "Invalid year";
    }
    if (formData.PriceNew !== null && formData.PriceNew !== undefined && formData.PriceNew < 0) {
      newErrors.PriceNew = "Price cannot be negative";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsLoading(true);
    try {
      const dataToSave = { ...formData };
      
      // Pass imageFile separately for optimistic UI handling
      await onSave(dataToSave, imageFile);
      onClose();
    } catch (error) {
      console.error("Failed to save vehicle:", error);
    } finally {
      setIsLoading(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--overlay-bg)] p-0 backdrop-blur-sm sm:items-center sm:p-4">
      {/* Liquid Glass Modal Container - Mobile Optimized */}
      <div 
        className="ec-glassCard flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-none sm:h-auto sm:max-h-[90vh] sm:rounded-2xl"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Header with Liquid Glass */}
        <div className="relative flex flex-shrink-0 items-center justify-between border-b border-[var(--glass-border)] bg-[linear-gradient(90deg,var(--accent-green),var(--accent-green-hover))] px-4 py-4 sm:px-6 sm:py-5">
          <div className="relative z-10">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--text-on-accent)] drop-shadow-sm">
              {isEditing ? "Edit Vehicle" : "Add New Vehicle"}
            </h2>
            <p className="mt-0.5 hidden text-xs text-[var(--text-on-accent-soft)] sm:block sm:text-sm">
              Enter the vehicle details below. Required fields are marked with an asterisk (*).
            </p>
          </div>
          <button
            onClick={onClose}
            className="group relative z-10 rounded-xl border border-[var(--glass-on-accent-border)] bg-[var(--glass-on-accent)] p-2 transition-all duration-300 ease-in-out hover:bg-[var(--glass-on-accent-border)]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-5 w-5 text-[var(--text-on-accent)] transition-transform group-hover:scale-110"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
          {/* Shimmer effect */}
          <div className="pointer-events-none absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-[var(--glass-on-accent)] to-transparent" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable Content */}
          <div className="flex-1 space-y-4 overflow-y-auto bg-transparent p-4 sm:space-y-6 sm:p-6">
            
            {/* Basic Information Section */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-green)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-green)]" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Category */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-sm font-medium text-[var(--text-primary)]">
                    Category <span className="text-[var(--accent-red)]">*</span>
                  </label>
                  <div className="ec-glassInput rounded-xl overflow-hidden">
                    <select
                      value={formData.Category || ""}
                      onChange={(e) => handleChange("Category", e.target.value)}
                      className={`w-full cursor-pointer bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none ${
                        errors.Category ? "text-[var(--accent-red)]" : ""
                      }`}
                    >
                      <option value="" className="bg-[var(--bg-elevated)]">Select category</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat} className="bg-[var(--bg-elevated)]">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.Category && (
                    <p className="flex items-center gap-1 text-xs text-[var(--accent-red)]">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {errors.Category}
                    </p>
                  )}
                </div>

                {/* Brand */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-sm font-medium text-[var(--text-primary)]">
                    Brand <span className="text-[var(--accent-red)]">*</span>
                  </label>
                  <GlassInput
                    value={formData.Brand || ""}
                    onChange={(e) => handleChange("Brand", e.target.value)}
                    placeholder="e.g., Toyota, Honda, Ford"
                    error={errors.Brand}
                    className="ec-glassInput rounded-xl"
                  />
                </div>

                {/* Model */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-sm font-medium text-[var(--text-primary)]">
                    Model <span className="text-[var(--accent-red)]">*</span>
                  </label>
                  <GlassInput
                    value={formData.Model || ""}
                    onChange={(e) => handleChange("Model", e.target.value)}
                    placeholder="e.g., Camry, Civic, F-150"
                    error={errors.Model}
                    className="ec-glassInput rounded-xl"
                  />
                </div>

                {/* Plate Number */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">
                    Plate Number
                  </label>
                  <GlassInput
                    value={formData.Plate || ""}
                    onChange={(e) => handleChange("Plate", e.target.value)}
                    placeholder="e.g., 1A-1234"
                    error={errors.Plate}
                    className="ec-glassInput rounded-xl"
                  />
                  {errors.Plate && (
                    <p className="text-xs text-[var(--accent-red)]">Format: 1A-1234</p>
                  )}
                </div>

                {/* Year */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-medium text-[var(--text-primary)]">
                    Year
                  </label>
                  <GlassInput
                    type="number"
                    value={formData.Year || ""}
                    onChange={(e) => handleChange("Year", e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="e.g., 2024"
                    error={errors.Year}
                    className="ec-glassInput rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Specifications Section */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-green)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-green)]" />
                Specifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Color */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">
                    Color
                  </label>
                  <div className="ec-glassInput rounded-xl overflow-hidden">
                    <select
                      value={formData.Color || ""}
                      onChange={(e) => handleChange("Color", e.target.value)}
                      className="w-full cursor-pointer bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none"
                    >
                      <option value="" className="bg-[var(--bg-elevated)]">Select or type a custom color</option>
                      {COLOR_OPTIONS.map((color) => (
                        <option key={color.value} value={color.value} className="bg-[var(--bg-elevated)]">
                          {color.value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Condition */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">
                    Condition
                  </label>
                  <div className="ec-glassInput rounded-xl overflow-hidden">
                    <select
                      value={formData.Condition || ""}
                      onChange={(e) => handleChange("Condition", e.target.value)}
                      className="w-full cursor-pointer bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none"
                    >
                      {CONDITIONS.map((cond) => (
                        <option key={cond} value={cond} className="bg-[var(--bg-elevated)]">
                          {cond}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Body Type */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">
                    Body Type
                  </label>
                  <div className="ec-glassInput rounded-xl overflow-hidden">
                    <select
                      value={formData.BodyType || ""}
                      onChange={(e) => handleChange("BodyType", e.target.value)}
                      className="w-full cursor-pointer bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none"
                    >
                      <option value="" className="bg-[var(--bg-elevated)]">Select or type a custom body type</option>
                      {BODY_TYPES.map((type) => (
                        <option key={type} value={type} className="bg-[var(--bg-elevated)]">
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tax Type */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">
                    Tax Type
                  </label>
                  <div className="ec-glassInput rounded-xl overflow-hidden">
                    <select
                      value={formData.TaxType || ""}
                      onChange={(e) => handleChange("TaxType", e.target.value)}
                      className="w-full cursor-pointer bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none"
                    >
                      <option value="" className="bg-[var(--bg-elevated)]">Select tax type</option>
                      {TAX_TYPE_OPTIONS.map((tax) => (
                        <option key={tax} value={tax} className="bg-[var(--bg-elevated)]">
                          {tax}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-green)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-green)]" />
                Pricing
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {/* Market Price */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">
                    Market Price
                  </label>
                  <GlassInput
                    type="number"
                    value={formData.PriceNew || ""}
                    onChange={(e) => handleChange("PriceNew", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="0.00"
                    error={errors.PriceNew}
                    className="ec-glassInput rounded-xl"
                  />
                  <p className="text-xs text-[var(--text-secondary)]">Enter the market price in USD</p>
                </div>

                {/* D.O.C. 40% - Auto-calculated with Liquid Glass */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-sm font-medium text-[var(--text-primary)]">
                    D.O.C. 40%
                    <span className="rounded-full border border-[var(--glass-border-strong)] bg-[var(--accent-green-soft)] px-1.5 py-0.5 text-xs font-medium text-[var(--accent-green)]">
                      Auto
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.Price40 ? formData.Price40.toLocaleString() : ""}
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-[var(--glass-border-strong)] bg-[var(--accent-green-soft)] px-4 py-3 text-sm text-[var(--accent-green)]"
                      placeholder="Auto-calculated"
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-xl animate-shimmer bg-gradient-to-r from-transparent via-[var(--glass-on-accent)] to-transparent" />
                  </div>
                  <p className="flex items-center gap-1 text-xs text-[var(--accent-green)]">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Auto-calculated from market price
                  </p>
                </div>

                {/* Vehicles 70% - Auto-calculated with Liquid Glass */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-sm font-medium text-[var(--text-primary)]">
                    Vehicles 70%
                    <span className="rounded-full border border-[var(--glass-border-strong)] bg-[var(--accent-green-soft)] px-1.5 py-0.5 text-xs font-medium text-[var(--accent-green)]">
                      Auto
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.Price70 ? formData.Price70.toLocaleString() : ""}
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-[var(--glass-border-strong)] bg-[var(--accent-green-soft)] px-4 py-3 text-sm text-[var(--accent-green)]"
                      placeholder="Auto-calculated"
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-xl animate-shimmer bg-gradient-to-r from-transparent via-[var(--glass-on-accent)] to-transparent" />
                  </div>
                  <p className="flex items-center gap-1 text-xs text-[var(--accent-green)]">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Auto-calculated from market price
                  </p>
                </div>
              </div>
            </div>

            {/* Vehicle Images Section */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-green)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-green)]" />
                Vehicle Images
              </h3>
              
              {/* Liquid Glass Drag & Drop Upload Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('vehicle-image')?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all duration-300 overflow-hidden cursor-pointer ${
                  isDragging
                    ? "scale-[1.02] border-[var(--accent-green)] bg-[var(--accent-green-soft)]"
                    : "border-[var(--glass-border)] bg-[var(--glass-bg-soft)] hover:border-[var(--glass-border-strong)]"
                }`}
              >

                {/* Liquid glass background effect */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--glass-on-accent)] via-transparent to-[var(--accent-green-soft)]" />
                
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-32 w-auto rounded-xl border border-[var(--glass-border)] object-cover shadow-lg sm:h-40"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -right-3 -top-3 rounded-full border border-[var(--accent-red)] bg-[var(--accent-red)] p-2 text-[var(--bg-elevated)] shadow-lg transition-all duration-300 ease-in-out hover:scale-110 hover:bg-[var(--accent-red-hover)] active:scale-95"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="relative space-y-3">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--glass-border)] bg-[var(--accent-green-soft)] shadow-inner sm:h-16 sm:w-16">
                      <svg
                        className="h-7 w-7 text-[var(--accent-green)] sm:h-8 sm:w-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        <span className="text-[var(--accent-green)]">Upload Image</span>
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">Drop image here or click to browse</p>
                      <p className="mt-0.5 text-xs text-[var(--text-secondary)]/85">Supports: JPEG, PNG, WebP • Max 10MB</p>
                    </div>
                  </div>
                )}
                
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="vehicle-image"
                />
                <label
                  htmlFor="vehicle-image"
                  className="pointer-events-auto relative mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] shadow-sm backdrop-blur-sm transition-all duration-300 ease-in-out hover:bg-[var(--glass-bg-soft)] hover:shadow-md sm:px-5 sm:py-2.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="h-4 w-4 text-[var(--accent-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  Choose File
                </label>

              </div>

              {/* Or enter Image URL with Liquid Glass */}
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="h-px flex-1 bg-[var(--glass-border)]" />
                  <span className="text-xs uppercase tracking-wider">Or</span>
                  <span className="h-px flex-1 bg-[var(--glass-border)]" />
                </p>
                <GlassInput
                  value={imageUrl}
                  onChange={(e) => handleImageUrlChange(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="ec-glassInput rounded-xl"
                />
                <p className="flex items-center gap-1 text-xs text-[var(--text-secondary)]/85">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Paste a direct image link
                </p>
              </div>
              
              {errors.Image && (
                <p className="animate-shake flex items-center gap-1 text-sm text-[var(--accent-red)]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.Image}
                </p>
              )}
            </div>
          </div>

          {/* Actions - Fixed Sticky Footer Always Visible */}
          <div className="flex flex-shrink-0 flex-col justify-end gap-2 border-t border-[var(--glass-border)] bg-[var(--glass-bg-soft)] px-4 py-4 backdrop-blur-xl sm:flex-row sm:gap-3 sm:px-6 sm:py-5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-5 py-3 text-sm font-medium text-[var(--text-primary)] shadow-sm backdrop-blur-sm transition-all duration-300 ease-in-out hover:bg-[var(--glass-bg-soft)] hover:shadow-md active:scale-95 sm:w-auto sm:py-2.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto ec-glassBtnPrimary relative px-6 py-3 sm:py-2.5 text-sm font-medium rounded-xl overflow-hidden active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{isEditing ? "Save Changes" : "Add Vehicle"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
