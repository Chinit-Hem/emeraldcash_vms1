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
  type Vehicle
} from "@/lib/types";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, type FormEvent } from "react";

const ADD_DRAFT_KEY = "vms.addVehicleDraft.v1";

export default function AddVehiclePage() {
  return <AddVehicleInner />;
}

function AddVehicleInner() {
  const router = useRouter();
  const user = useAuthUser();
  const isAdmin = user.role === "Admin";
  const [imageLoading, setImageLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [compressedImage, setCompressedImage] = useState<{
    file: File;
    dataUrl: string;
    originalSize: number;
    compressedSize: number;
  } | null>(null);
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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const draft: Partial<Vehicle> = { ...formData };
        if (typeof draft.Image === "string" && draft.Image.trim().startsWith("data:")) {
          // Avoid storing large base64 images in sessionStorage.
          draft.Image = "";
        }
        sessionStorage.setItem(ADD_DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // ignore storage errors
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [formData]);

  const handleChange = (field: keyof Vehicle, value: string | number | boolean | null) => {
    setFormData((prev) => {
      const next: Partial<Vehicle> = { ...prev, [field]: value };
      if (field === "PriceNew") {
        // Validate: price must be positive
        const rawValue = typeof value === "number" ? value : (typeof value === "string" ? Number.parseFloat(value) : NaN);
        const priceNew = Number.isFinite(rawValue) && rawValue > 0 ? rawValue : null;
        const derived = derivePrices(priceNew);
        next.PriceNew = priceNew;
        next.Price40 = derived.Price40;
        next.Price70 = derived.Price70;
      }
      return next;
    });
  };

  const handleImageFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Image too large (max 10MB)");
      return;
    }

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
      alert(err instanceof Error ? err.message : "Failed to compress image");
    } finally {
      setImageLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    // Immediately reset form and show success
    try {
      sessionStorage.removeItem(ADD_DRAFT_KEY);
    } catch {
      // ignore
    }

    setSuccessMessage("Vehicle added successfully!");

    // Reset form for next vehicle
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

    // Process the submission in the background
    (async () => {
      try {
        const formDataToSend = new FormData();

        // Add vehicle data
        Object.entries(formData).forEach(([key, value]) => {
          if (value != null) {
            formDataToSend.append(key, String(value));
          }
        });
        formDataToSend.append("Time", getCambodiaNowString());

        // Add compressed image if available
        if (compressedImage?.file) {
          formDataToSend.append("image", compressedImage.file);
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

        // Success already shown
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error adding vehicle");
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const categories = ["Cars", "Motorcycles", "Tuk Tuk"];
  const conditions = ["New", "Used", "Damaged"];
  const bodyTypes = ["Sedan", "SUV", "Truck", "Van", "Bike", "Other"];
  // tax types are available via `TAX_TYPE_OPTIONS`; no local copy needed

  if (!isAdmin) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto ec-glassPanel rounded-2xl shadow-xl ring-1 ring-black/5 p-8">
          <h1 className="text-2xl font-bold text-gray-900">Forbidden</h1>
          <p className="text-gray-600 mt-2">Only Admin can add vehicles.</p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => router.back()}
              className="px-5 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition font-medium"
            >
              Back
            </button>
            <button
              onClick={() => router.push("/vehicles")}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              All Vehicles
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto ec-glassPanel rounded-2xl shadow-xl ring-1 ring-black/5 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Add New Vehicle</h1>
          <p className="text-gray-600 mt-2">Fill in the vehicle details below</p>
        </div>

        {/* Success Message Banner */}
        {successMessage ? (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-green-600"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span className="text-green-800 font-medium">{successMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              className="text-green-600 hover:text-green-800 transition"
              aria-label="Dismiss success message"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M18 6 6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : null}

        {/* Form */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
            <select
              required
              autoFocus
              value={formData.Category || ""}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange("Category", e.target.value)}
              className="ec-input ec-select w-full"
            >
              <option value="" disabled>
                Select category
              </option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Brand *</label>
            <input
              type="text"
              required
              maxLength={100}
              value={formData.Brand || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("Brand", e.target.value)}
              className="ec-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Model *</label>
            <input
              type="text"
              required
              maxLength={100}
              value={formData.Model || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("Model", e.target.value)}
              className="ec-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Plate *</label>
            <input
              type="text"
              required
              maxLength={PLATE_NUMBER_MAX_LENGTH}
              value={formData.Plate || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange("Plate", e.target.value.toUpperCase())
              }
              placeholder={`e.g. ${PLATE_NUMBER_HINTS[0]}`}
              className="ec-input w-full font-mono uppercase placeholder:normal-case"
            />

          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <input
              type="number"
              value={formData.Year ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange(
                  "Year",
                  e.target.value === ""
                    ? null
                    : Number.isNaN(Number.parseInt(e.target.value, 10))
                      ? null
                      : Number.parseInt(e.target.value, 10)
                )
              }
              className="ec-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <input
              type="text"
              list="colorsList"
              value={formData.Color || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("Color", e.target.value)}
              className="ec-input w-full"
              placeholder="Type color (e.g., White, Black, Red, Custom)"
            />
            <datalist id="colorsList">
              {COLOR_OPTIONS.map((color) => (
                <option key={color.value} value={color.value} />
              ))}
            </datalist>
            {formData.Color && (
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded border border-gray-300"
                  style={{ backgroundColor: COLOR_OPTIONS.find(c => c.value === formData.Color)?.hex || formData.Color }}
                />
                <span className="text-sm text-gray-600">{formData.Color}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
            <select
              value={formData.Condition || "New"}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange("Condition", e.target.value)}
              className="ec-input ec-select w-full"
            >
              {conditions.map((cond) => (
                <option key={cond} value={cond}>
                  {cond}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Body Type</label>
            <input
              type="text"
              list="bodyTypesList"
              value={formData.BodyType || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("BodyType", e.target.value)}
              className="ec-input w-full"
              placeholder="Type body type (or choose)"
            />
            <datalist id="bodyTypesList">
              {bodyTypes.map((bt) => (
                <option key={bt} value={bt} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tax Type</label>
            <input
              type="text"
              list="taxTypesList"
              value={formData.TaxType || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("TaxType", e.target.value)}
              className="ec-input w-full"
              placeholder="Type tax type (or choose)"
            />
            <datalist id="taxTypesList">
              {TAX_TYPE_METADATA.map((tt) => (
                <option key={tt.value} value={tt.label} />
              ))}
            </datalist>
            {formData.TaxType && (
              <p className="mt-1 text-xs text-gray-600">
                {TAX_TYPE_METADATA.find((tt) => tt.value === formData.TaxType)?.description || "Custom tax type"}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Market Price</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.PriceNew ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange(
                  "PriceNew",
                  e.target.value === ""
                    ? null
                    : Number.isNaN(Number.parseFloat(e.target.value))
                      ? null
                      : Number.parseFloat(e.target.value)
                )
              }
              className="ec-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">D.O.C.40%</label>
            <input
              type="number"
              readOnly
              value={formData.Price40 ?? ""}
              placeholder="Auto"
              className="ec-input w-full bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vehicles70%</label>
            <input
              type="number"
              readOnly
              value={formData.Price70 ?? ""}
              placeholder="Auto"
              className="ec-input w-full bg-gray-50"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Image (Upload or URL)</label>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-700 file:text-white file:font-medium hover:file:bg-green-800"
                />
                <p className="text-xs text-gray-500 mt-2">
                  {imageLoading
                    ? "Compressing image..."
                    : compressedImage
                    ? `Compressed: ${formatFileSize(compressedImage.compressedSize)} (was ${formatFileSize(compressedImage.originalSize)})`
                    : "Max 10MB. Images are compressed for fast upload."
                  }
                </p>
              </div>
              <div>
                <input
                  type="url"
                  value={formData.Image || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("Image", e.target.value)}
                  placeholder="https://..."
                  className="ec-input w-full placeholder:text-gray-400"
                />
                {formData.Image ? (
                  <button
                    type="button"
                    onClick={() => handleChange("Image", "")}
                    className="mt-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Clear image
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {formData.Image ? (
            <div className="col-span-2">
              <h2 className="text-sm font-medium text-gray-700 mb-2">Preview</h2>
              <ImageZoom src={String(formData.Image)} alt="Vehicle image preview" />
            </div>
          ) : null}

          {/* Submit Buttons */}
          <div className="col-span-2 flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 ec-glassBtnPrimary px-6 py-3"
            >
              {submitting ? "Adding..." : "Add Vehicle"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 ec-glassBtnSecondary px-6 py-3"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
