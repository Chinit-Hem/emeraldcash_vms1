"use client";

import { useAuthUser } from "@/app/components/AuthContext";
import ImageZoom from "@/app/components/ImageZoom";
import { getCambodiaNowString } from "@/lib/cambodiaTime";
import { fileToDataUrl } from "@/lib/fileToDataUrl";
import { derivePrices } from "@/lib/pricing";
import type { Vehicle } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

const ADD_DRAFT_KEY = "vms.addVehicleDraft.v1";

export default function AddVehiclePage() {
  return <AddVehicleInner />;
}

function AddVehicleInner() {
  const router = useRouter();
  const user = useAuthUser();
  const isAdmin = user.role === "Admin";
  const [cambodiaNow, setCambodiaNow] = useState(() => getCambodiaNowString());
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
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
    const interval = window.setInterval(() => setCambodiaNow(getCambodiaNowString()), 1000);
    return () => window.clearInterval(interval);
  }, []);

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

  const handleChange = (field: keyof Vehicle, value: string | number | null) => {
    setFormData((prev) => {
      const next: Partial<Vehicle> = { ...prev, [field]: value };
      if (field === "PriceNew") {
        const priceNew = typeof value === "number" && Number.isFinite(value) ? value : null;
        const derived = derivePrices(priceNew);
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
    if (file.size > 4 * 1024 * 1024) {
      alert("Image too large (max 4MB)");
      return;
    }

    setImageLoading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      handleChange("Image", dataUrl);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load image");
    } finally {
      setImageLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: Partial<Vehicle> = {
        ...formData,
        Time: getCambodiaNowString(),
      };

      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const json = await res.json().catch(() => ({}));
      if (res.status === 403) throw new Error("Forbidden");
      if (!res.ok || json.ok === false) throw new Error(json.error || "Failed to add vehicle");
      try {
        sessionStorage.removeItem(ADD_DRAFT_KEY);
      } catch {
        // ignore
      }
      alert("Vehicle added successfully!");
      router.push("/vehicles");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error adding vehicle");
    } finally {
      setLoading(false);
    }
  };

  const categories = ["Cars", "Motorcycles", "Tuk Tuk"];
  const conditions = ["New", "Used", "Damaged"];
  const bodyTypes = ["Sedan", "SUV", "Truck", "Van", "Bike", "Other"];
  const taxTypes = ["Standard", "Luxury", "Commercial"];

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

        {/* Form */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
            <select
              required
              autoFocus
              value={formData.Category || ""}
              onChange={(e) => handleChange("Category", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900"
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
              value={formData.Brand || ""}
              onChange={(e) => handleChange("Brand", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Model *</label>
            <input
              type="text"
              required
              value={formData.Model || ""}
              onChange={(e) => handleChange("Model", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Plate *</label>
            <input
              type="text"
              required
              value={formData.Plate || ""}
              onChange={(e) => handleChange("Plate", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <input
              type="number"
              value={formData.Year ?? ""}
              onChange={(e) =>
                handleChange(
                  "Year",
                  e.target.value === ""
                    ? null
                    : Number.isNaN(Number.parseInt(e.target.value, 10))
                      ? null
                      : Number.parseInt(e.target.value, 10)
                )
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time (Cambodia)</label>
            <input
              type="text"
              readOnly
              value={cambodiaNow}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-2">Saved automatically when you add the vehicle.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <input
              type="text"
              value={formData.Color || ""}
              onChange={(e) => handleChange("Color", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
            <select
              value={formData.Condition || "New"}
              onChange={(e) => handleChange("Condition", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900"
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
              onChange={(e) => handleChange("BodyType", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900"
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
              onChange={(e) => handleChange("TaxType", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900"
              placeholder="Type tax type (or choose)"
            />
            <datalist id="taxTypesList">
              {taxTypes.map((tt) => (
                <option key={tt} value={tt} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Market Price</label>
            <input
              type="number"
              value={formData.PriceNew ?? ""}
              onChange={(e) =>
                handleChange(
                  "PriceNew",
                  e.target.value === ""
                    ? null
                    : Number.isNaN(Number.parseFloat(e.target.value))
                      ? null
                      : Number.parseFloat(e.target.value)
                )
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">D.O.C.40%</label>
            <input
              type="number"
              readOnly
              value={formData.Price40 ?? ""}
              placeholder="Auto"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vehicles70%</label>
            <input
              type="number"
              readOnly
              value={formData.Price70 ?? ""}
              placeholder="Auto"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Image (Upload or URL)</label>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-700 file:text-white file:font-medium hover:file:bg-green-800"
                />
                <p className="text-xs text-gray-500 mt-2">
                  {imageLoading ? "Loading image..." : "Max 4MB. Uploaded to Google Drive and saved in Google Sheet."}
                </p>
              </div>
              <div>
                <input
                  type="url"
                  value={formData.Image || ""}
                  onChange={(e) => handleChange("Image", e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900 placeholder:text-gray-400"
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
              disabled={loading}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition font-medium"
            >
              {loading ? "Adding..." : "Add Vehicle"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
