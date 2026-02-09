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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      {/* Liquid Glass Modal Container */}
      <div className="ec-glassCard w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden bg-gradient-to-br from-white/70 via-emerald-100/20 via-red-50/10 via-emerald-50/15 to-white/70 dark:from-white/8 dark:via-emerald-500/15 dark:via-red-900/8 dark:via-emerald-900/12 dark:to-white/8">
        {/* Header with Liquid Glass */}
        <div className="relative flex items-center justify-between px-6 py-5 border-b border-white/20 bg-gradient-to-r from-emerald-600/90 to-emerald-500/90">
          <div className="relative z-10">
            <h2 className="text-xl font-bold text-white drop-shadow-sm">
              {isEditing ? "Edit Vehicle" : "Add New Vehicle"}
            </h2>
            <p className="text-sm text-emerald-50/90 mt-0.5">
              Enter the vehicle details below. Required fields are marked with an asterisk (*).
            </p>
          </div>
          <button
            onClick={onClose}
            className="relative z-10 p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-200 group"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-5 w-5 text-white group-hover:scale-110 transition-transform"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer pointer-events-none" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-white/5 to-transparent">
            
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <div className="ec-glassInput rounded-xl overflow-hidden">
                    <select
                      value={formData.Category || ""}
                      onChange={(e) => handleChange("Category", e.target.value)}
                      className={`w-full px-4 py-3 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none cursor-pointer ${
                        errors.Category ? "text-red-500" : ""
                      }`}
                    >
                      <option value="" className="bg-white dark:bg-gray-800">Select category</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat} className="bg-white dark:bg-gray-800">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.Category && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {errors.Category}
                    </p>
                  )}
                </div>

                {/* Brand */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1">
                    Brand <span className="text-red-500">*</span>
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
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1">
                    Model <span className="text-red-500">*</span>
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
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
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
                    <p className="text-xs text-red-500">Format: 1A-1234</p>
                  )}
                </div>

                {/* Year */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
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
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Specifications
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Color */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Color
                  </label>
                  <div className="ec-glassInput rounded-xl overflow-hidden">
                    <select
                      value={formData.Color || ""}
                      onChange={(e) => handleChange("Color", e.target.value)}
                      className="w-full px-4 py-3 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="" className="bg-white dark:bg-gray-800">Select or type a custom color</option>
                      {COLOR_OPTIONS.map((color) => (
                        <option key={color.value} value={color.value} className="bg-white dark:bg-gray-800">
                          {color.value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Condition */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Condition
                  </label>
                  <div className="ec-glassInput rounded-xl overflow-hidden">
                    <select
                      value={formData.Condition || ""}
                      onChange={(e) => handleChange("Condition", e.target.value)}
                      className="w-full px-4 py-3 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none cursor-pointer"
                    >
                      {CONDITIONS.map((cond) => (
                        <option key={cond} value={cond} className="bg-white dark:bg-gray-800">
                          {cond}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Body Type */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Body Type
                  </label>
                  <div className="ec-glassInput rounded-xl overflow-hidden">
                    <select
                      value={formData.BodyType || ""}
                      onChange={(e) => handleChange("BodyType", e.target.value)}
                      className="w-full px-4 py-3 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="" className="bg-white dark:bg-gray-800">Select or type a custom body type</option>
                      {BODY_TYPES.map((type) => (
                        <option key={type} value={type} className="bg-white dark:bg-gray-800">
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tax Type */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Tax Type
                  </label>
                  <div className="ec-glassInput rounded-xl overflow-hidden">
                    <select
                      value={formData.TaxType || ""}
                      onChange={(e) => handleChange("TaxType", e.target.value)}
                      className="w-full px-4 py-3 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="" className="bg-white dark:bg-gray-800">Select tax type</option>
                      {TAX_TYPE_OPTIONS.map((tax) => (
                        <option key={tax} value={tax} className="bg-white dark:bg-gray-800">
                          {tax}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Pricing
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Market Price */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
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
                  <p className="text-xs text-gray-500 dark:text-gray-400">Enter the market price in USD</p>
                </div>

                {/* D.O.C. 40% - Auto-calculated with Liquid Glass */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1">
                    D.O.C. 40%
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-medium">
                      Auto
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.Price40 ? formData.Price40.toLocaleString() : ""}
                      disabled
                      className="w-full px-4 py-3 bg-gradient-to-br from-emerald-50/80 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20 border-2 border-emerald-200/50 dark:border-emerald-700/30 rounded-xl text-sm text-emerald-700 dark:text-emerald-300 cursor-not-allowed backdrop-blur-sm"
                      placeholder="Auto-calculated"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400/0 via-emerald-400/10 to-emerald-400/0 animate-shimmer pointer-events-none" />
                  </div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Auto-calculated from market price
                  </p>
                </div>

                {/* Vehicles 70% - Auto-calculated with Liquid Glass */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1">
                    Vehicles 70%
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-medium">
                      Auto
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.Price70 ? formData.Price70.toLocaleString() : ""}
                      disabled
                      className="w-full px-4 py-3 bg-gradient-to-br from-emerald-50/80 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20 border-2 border-emerald-200/50 dark:border-emerald-700/30 rounded-xl text-sm text-emerald-700 dark:text-emerald-300 cursor-not-allowed backdrop-blur-sm"
                      placeholder="Auto-calculated"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400/0 via-emerald-400/10 to-emerald-400/0 animate-shimmer pointer-events-none" />
                  </div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Auto-calculated from market price
                  </p>
                </div>
              </div>
            </div>

            {/* Vehicle Images Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Vehicle Images
              </h3>
              
              {/* Liquid Glass Drag & Drop Upload Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('vehicle-image')?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 overflow-hidden cursor-pointer ${
                  isDragging
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 scale-[1.02]"
                    : "border-gray-300 dark:border-gray-600 hover:border-emerald-400 dark:hover:border-emerald-500 bg-white/30 dark:bg-gray-800/30"
                }`}
              >

                {/* Liquid glass background effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-emerald-50/20 dark:from-gray-700/20 dark:to-emerald-900/10 pointer-events-none" />
                
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-40 w-auto rounded-xl object-cover shadow-lg ring-2 ring-white dark:ring-gray-700"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-3 -right-3 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="relative space-y-3">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-800/20 flex items-center justify-center shadow-inner">
                      <svg
                        className="w-8 h-8 text-emerald-500 dark:text-emerald-400"
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
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        <span className="text-emerald-600 dark:text-emerald-400">Upload Image</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Drop image here or click to browse</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Supports: JPEG, PNG, WebP • Max 10MB</p>
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
                  className="relative mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-white/80 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-600 text-sm font-medium backdrop-blur-sm pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  Choose File
                </label>

              </div>

              {/* Or enter Image URL with Liquid Glass */}
              <div className="space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                  <span className="text-xs uppercase tracking-wider">Or</span>
                  <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                </p>
                <GlassInput
                  value={imageUrl}
                  onChange={(e) => handleImageUrlChange(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="ec-glassInput rounded-xl"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Paste a direct image link
                </p>
              </div>
              
              {errors.Image && (
                <p className="text-sm text-red-500 flex items-center gap-1 animate-shake">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.Image}
                </p>
              )}
            </div>
          </div>

          {/* Actions - Sticky Footer */}
          <div className="sticky bottom-0 flex flex-col sm:flex-row justify-end gap-3 px-6 py-5 border-t border-white/20 bg-gradient-to-r from-gray-50/80 to-gray-100/50 dark:from-gray-800/80 dark:to-gray-900/50 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white/70 dark:bg-gray-700/70 hover:bg-white dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 backdrop-blur-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto ec-glassBtnPrimary relative px-6 py-2.5 text-sm font-medium rounded-xl overflow-hidden active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
