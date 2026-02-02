import { driveThumbnailUrl } from "@/lib/drive";
import { derivePrices } from "@/lib/pricing";
import type { Vehicle } from "@/lib/types";

/** Fetch with timeout to avoid ETIMEDOUT when calling Apps Script (e.g. large image upload). */
export async function fetchAppsScript(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 30000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

const DEFAULT_DRIVE_FOLDER_CARS = "1UKgtZ_sSNSVy3p-8WBwBrploVL9IDxec";
const DEFAULT_DRIVE_FOLDER_MOTORCYCLES = "10OcxTtK6ZqQj5cvPMNNIP4VsaVneGiYP";
const DEFAULT_DRIVE_FOLDER_TUKTUK = "18oDOlZXE9JGE5EDZ7yL6oBRVG6SgVYdP";

function toStringValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

export function driveFolderIdForCategory(category: unknown): string | null {
  const raw = toStringValue(category).trim();
  const normalized = raw.toLowerCase();
  if (!normalized) return null;

  if (normalized === "car" || normalized === "cars") {
    return process.env.DRIVE_FOLDER_CARS?.trim() || DEFAULT_DRIVE_FOLDER_CARS;
  }

  if (normalized === "motorcycle" || normalized === "motorcycles") {
    return process.env.DRIVE_FOLDER_MOTORCYCLES?.trim() || DEFAULT_DRIVE_FOLDER_MOTORCYCLES;
  }

  if (normalized === "tuktuk" || normalized === "tuk tuk" || normalized === "tuk-tuk") {
    return process.env.DRIVE_FOLDER_TUKTUK?.trim() || DEFAULT_DRIVE_FOLDER_TUKTUK;
  }

  return null;
}

export function parseImageDataUrl(
  value: unknown
): { mimeType: string; base64Data: string } | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("data:")) return null;

  const match = trimmed.match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=]+)$/i);
  if (!match) return null;

  const mimeType = match[1]?.toLowerCase() ?? "";
  const base64Data = match[2] ?? "";
  if (!mimeType || !base64Data) return null;

  return { mimeType, base64Data };
}

export { driveThumbnailUrl };

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replaceAll(",", "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined) return value;
  }

  const normalizeKey = (value: string) => value.toLowerCase().replace(/\s+/g, "");
  const normalizedRow = new Map<string, unknown>();
  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizeKey(key);
    if (!normalized || normalizedRow.has(normalized)) continue;
    normalizedRow.set(normalized, value);
  }

  for (const key of keys) {
    const normalized = normalizeKey(key);
    const value = normalizedRow.get(normalized);
    if (value !== undefined) return value;
  }

  return undefined;
}

function normalizeCategoryFromSheet(value: unknown): string {
  const raw = toStringValue(value).trim();
  const normalized = raw.toLowerCase();
  if (!normalized) return "";

  if (normalized === "car" || normalized === "cars") return "Cars";
  if (normalized === "motorcycle" || normalized === "motorcycles") return "Motorcycles";
  if (normalized === "tuktuk" || normalized === "tuk tuk" || normalized === "tuk-tuk") return "Tuk Tuk";

  return raw;
}

function normalizeCategoryToSheet(value: unknown): string {
  const raw = toStringValue(value).trim();
  const normalized = raw.toLowerCase();
  if (!normalized) return "";

  if (normalized === "cars" || normalized === "car") return "Car";
  if (normalized === "motorcycles" || normalized === "motorcycle") return "Motorcycle";
  if (normalized === "tuktuk" || normalized === "tuk tuk" || normalized === "tuk-tuk") return "Tuk Tuk";

  return raw;
}

export function appsScriptUrl(baseUrl: string, action: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("action", action);
  return url.toString();
}

export function toVehicle(row: Record<string, unknown>): Vehicle {
  const vehicleId = toStringValue(pick(row, ["VehicleId", "VehicleID", "Id", "id"]));

  const categoryRaw = pick(row, ["Category"]);
  const category = normalizeCategoryFromSheet(categoryRaw);

  const brand = toStringValue(pick(row, ["Brand"]));
  const model = toStringValue(pick(row, ["Model"]));
  const plate = toStringValue(pick(row, ["Plate", "PlateNumber", "Plate Number"]));

  const year = toNumberOrNull(pick(row, ["Year"]));
  const priceNew = toNumberOrNull(pick(row, ["PriceNew", "Market Price", "Price New", "Price (New)"]));
  const price40 = toNumberOrNull(
    pick(row, ["Price40", "D.O.C.40%", "D.O.C.1 40%", "Price 40%", "Price 40", "Price40%"])
  );
  const price70 = toNumberOrNull(
    pick(row, ["Price70", "Vehicles70%", "Vehicle 70%", "Vihicle 70%", "Price 70%", "Price 70", "Price70%"])
  );
  const derived = derivePrices(priceNew);

  const taxType = toStringValue(pick(row, ["TaxType", "Tax Type"]));
  const condition = toStringValue(pick(row, ["Condition"]));
  const bodyType = toStringValue(pick(row, ["BodyType", "Body Type"]));
  const color = toStringValue(pick(row, ["Color"]));
  const image = toStringValue(pick(row, ["Image", "ImageURL", "Image URL"]));
  const time = toStringValue(pick(row, ["Time", "Added Time"]));
  const fast = pick(row, ["Fast"]) === "true" || pick(row, ["Fast"]) === true;

  return {
    VehicleId: vehicleId,
    Category: category,
    Brand: brand,
    Model: model,
    Year: year,
    Plate: plate,
    PriceNew: priceNew,
    Price40: price40 ?? derived.Price40,
    Price70: price70 ?? derived.Price70,
    TaxType: taxType,
    Condition: condition,
    BodyType: bodyType,
    Color: color,
    Image: image,
    Time: time,
    Fast: fast,
  };
}

export function toAppsScriptPayload(
  input: Record<string, unknown>,
  options?: { vehicleId?: string }
): Record<string, unknown> {
  const vehicleId = options?.vehicleId ?? toStringValue(pick(input, ["VehicleId", "VehicleID", "Id", "id"]));

  const categoryRaw = pick(input, ["Category"]);
  const categorySheet = normalizeCategoryToSheet(categoryRaw);

  const year = toNumberOrNull(pick(input, ["Year"]));
  const priceNew = toNumberOrNull(pick(input, ["PriceNew", "Market Price", "Price New", "Price (New)"]));
  const derived = derivePrices(priceNew);
  const price40 =
    toNumberOrNull(pick(input, ["Price40", "D.O.C.40%", "D.O.C.1 40%", "Price 40%", "Price 40", "Price40%"])) ??
    derived.Price40;
  const price70 =
    toNumberOrNull(pick(input, ["Price70", "Vehicles70%", "Vehicle 70%", "Vihicle 70%", "Price 70%", "Price 70", "Price70%"])) ??
    derived.Price70;

  const taxType = toStringValue(pick(input, ["TaxType", "Tax Type"]));
  const bodyType = toStringValue(pick(input, ["BodyType", "Body Type"]));
  const fast = pick(input, ["Fast"]) === "true" || pick(input, ["Fast"]) === true;

  const payload: Record<string, unknown> = {
    VehicleId: vehicleId,
    id: vehicleId,
    VehicleID: vehicleId,
    Category: categorySheet,
    Brand: toStringValue(pick(input, ["Brand"])),
    Model: toStringValue(pick(input, ["Model"])),
    Year: year ?? "",
    Plate: toStringValue(pick(input, ["Plate", "PlateNumber", "Plate Number"])),
    Condition: toStringValue(pick(input, ["Condition"])),
    Color: toStringValue(pick(input, ["Color"])),
    Image: toStringValue(pick(input, ["Image", "ImageURL", "Image URL"])),
    Time: toStringValue(pick(input, ["Time"])),
    Fast: fast,

    // Compatibility keys (camelCase)
    PriceNew: priceNew ?? "",
    Price40: price40 ?? "",
    Price70: price70 ?? "",
    TaxType: taxType,
    BodyType: bodyType,
  };

  // Compatibility keys (Google Sheet headers with spaces)
  payload["Price New"] = priceNew ?? "";
  payload["Market Price"] = priceNew ?? "";
  payload["Price 40%"] = price40 ?? "";
  payload["D.O.C.1 40%"] = price40 ?? "";
  payload["D.O.C.40%"] = price40 ?? "";
  payload["Price 70%"] = price70 ?? "";
  payload["Vehicle 70%"] = price70 ?? "";
  payload["Vehicles70%"] = price70 ?? "";
  payload["Tax Type"] = taxType;
  payload["Body Type"] = bodyType;

  return payload;
}
