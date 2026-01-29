/**
 * Emerald Cash VMS - Vehicle API for Google Sheets (Web App)
 *
 * Supports:
 *  - GET  ?action=getVehicles   (alias: getAll)
 *  - GET  ?action=getById&id=123
 *  - POST {"action":"add","data":{...}}
 *  - POST {"action":"update","id":"123","data":{...}}
 *  - POST {"action":"delete","id":"123","imageFileId":"<optional>","token":"<optional>"}
 *  - POST {"action":"uploadImage","folderId":"<DriveFolderId>","data":"<base64>","mimeType":"image/png","fileName":"name.png","token":"<optional>"}
 *
 * Notes:
 *  - If you deploy this as a *bound* script (inside a Google Sheet), you can leave SPREADSHEET_ID empty.
 *  - If you deploy this as a *standalone* script, paste your Spreadsheet ID into SPREADSHEET_ID.
 */

/* ----------------- CONFIG ----------------- */

// Optional: for Standalone Script. Leave "" for bound scripts.
const SPREADSHEET_ID = "";

// Sheet tab name to use. If not found, falls back to a "Vehicles" tab, otherwise the first tab.
const SHEET_NAME = "Vehicles";

// Column headers (must match row 1 in your sheet)
const HEADERS = [
  "VehicleId",
  "Category",
  "Brand",
  "Model",
  "Year",
  "Plate",
  "Market Price",
  "Price Used",
  "Tax Type",
  "Condition",
  "Body Type",
  "Color",
  "Image",
  "Time",
  "D.O.C.1 40%",
  "Vehicle 70%",
];

// Optional: default Drive folders per Category (used if uploadImage is called without folderId)
const DRIVE_FOLDER_CARS = "1UKgtZ_sSNSVy3p-8WBwBrploVL9IDxec";
const DRIVE_FOLDER_MOTORCYCLES = "10OcxTtK6ZqQj5cvPMNNIP4VsaVneGiYP";
const DRIVE_FOLDER_TUKTUK = "18oDOlZXE9JGE5EDZ7yL6oBRVG6SgVYdP";

/* ----------------- ROUTES ----------------- */

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || "getVehicles").trim();

  if (action === "getVehicles" || action === "getAll") {
    return jsonOut_({ ok: true, data: getVehicles_() });
  }

  if (action === "getById") {
    const id = String((e && e.parameter && (e.parameter.id || e.parameter.VehicleId)) || "").trim();
    if (!id) return jsonOut_({ ok: false, error: "Missing id" });

    const found = getById_(id);
    if (!found) return jsonOut_({ ok: false, error: "Vehicle not found" });

    return jsonOut_({ ok: true, data: found });
  }

  return jsonOut_({ ok: false, error: "Unknown action", action: action });
}

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    const payload = JSON.parse(raw || "{}");
    const action = String(payload.action || (e && e.parameter && e.parameter.action) || "").trim();

    if (action === "uploadImage") return jsonOut_(uploadImage_(payload));

    if (action === "add") {
      const created = addRow_(payload.data || {});
      return jsonOut_({ ok: true, data: created });
    }

    if (action === "update") {
      const id = String(payload.id || "").trim();
      if (!id) return jsonOut_({ ok: false, error: "Missing id" });
      const updated = updateRow_(id, payload.data || {});
      return jsonOut_({ ok: true, data: updated });
    }

    if (action === "delete") {
      const id = String(payload.id || "").trim();
      if (!id) return jsonOut_({ ok: false, error: "Missing id" });
      const deleted = deleteRow_(id, payload);
      return jsonOut_({ ok: true, data: deleted });
    }

    return jsonOut_({ ok: false, error: "Unknown action: " + action });
  } catch (err) {
    return jsonOut_({
      ok: false,
      error: String(err && err.message ? err.message : err),
      stack: String(err && err.stack ? err.stack : ""),
    });
  }
}

/* ----------------- SHEET HELPERS ----------------- */

function getSheet_() {
  const id = String(SPREADSHEET_ID || "").trim();
  const useOpenById = id && id !== "PASTE_YOUR_SHEET_ID_HERE";

  const ss = useOpenById
    ? SpreadsheetApp.openById(id)
    : SpreadsheetApp.getActiveSpreadsheet();

  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh && SHEET_NAME !== "Vehicles") sh = ss.getSheetByName("Vehicles");
  if (!sh) sh = ss.getSheets()[0];
  if (!sh) throw new Error("Sheet not found: " + SHEET_NAME);

  ensureHeaderRow_(sh);
  return sh;
}

function ensureHeaderRow_(sh) {
  const firstRow = sh.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const isEmpty = firstRow.every(function (v) { return String(v || "").trim() === ""; });
  if (isEmpty) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return;
  }

  const renameMap = {
    "Price New": "Market Price",
    "Price 40%": "D.O.C.1 40%",
    "Price 70%": "Vehicle 70%",
    "Vihicle 70%": "Vehicle 70%",
  };

  let needsUpdate = false;
  const next = firstRow.slice(0, HEADERS.length);
  for (let i = 0; i < HEADERS.length; i++) {
    const existing = String(next[i] || "").trim();
    const rename = renameMap[existing];
    if (rename && rename === HEADERS[i]) {
      next[i] = HEADERS[i];
      needsUpdate = true;
    } else if (!existing) {
      next[i] = HEADERS[i];
      needsUpdate = true;
    }
  }
  if (needsUpdate) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([next]);
  }
}

function getVehicles_() {
  const sh = getSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];

  const values = sh.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  return values.map(function (row) {
    const byHeader = rowToHeaderObject_(row);
    return headerToFriendly_(byHeader);
  });
}

function getById_(id) {
  const sh = getSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return null;

  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(function (v) {
    return String(v || "").trim();
  });
  const idx = ids.findIndex(function (x) { return x === String(id).trim(); });
  if (idx === -1) return null;

  const rowValues = sh.getRange(idx + 2, 1, 1, HEADERS.length).getValues()[0];
  return headerToFriendly_(rowToHeaderObject_(rowValues));
}

function addRow_(data) {
  const sh = getSheet_();

  const now = new Date().toISOString();
  const vehicleId = String(data.VehicleId || data["VehicleId"] || data.id || "").trim() || String(Date.now());

  const byHeader = normalizeToHeaders_(data);
  byHeader["VehicleId"] = vehicleId;
  byHeader["Time"] = String(byHeader["Time"] || now);
  computeDerivedPrices_(byHeader);

  sh.appendRow(headersToRow_(byHeader));
  return headerToFriendly_(byHeader);
}

function updateRow_(id, data) {
  const sh = getSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) throw new Error("No data to update");

  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(function (v) {
    return String(v || "").trim();
  });
  const idx = ids.findIndex(function (x) { return x === String(id).trim(); });
  if (idx === -1) throw new Error("VehicleId not found: " + id);

  const rowNumber = idx + 2;
  const existing = sh.getRange(rowNumber, 1, 1, HEADERS.length).getValues()[0];
  const existingByHeader = rowToHeaderObject_(existing);

  const updates = normalizeToHeaders_(data);
  const merged = Object.assign({}, existingByHeader, updates);
  merged["VehicleId"] = existingByHeader["VehicleId"];
  merged["Time"] = String(updates["Time"] || new Date().toISOString());
  computeDerivedPrices_(merged);

  sh.getRange(rowNumber, 1, 1, HEADERS.length).setValues([headersToRow_(merged)]);
  return headerToFriendly_(merged);
}

function deleteRow_(id, payload) {
  const sh = getSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) throw new Error("No data to delete");

  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(function (v) {
    return String(v || "").trim();
  });
  const idx = ids.findIndex(function (x) { return x === String(id).trim(); });
  if (idx === -1) throw new Error("VehicleId not found: " + id);

  const rowNumber = idx + 2;
  const rowValues = sh.getRange(rowNumber, 1, 1, HEADERS.length).getValues()[0];
  const deletedByHeader = rowToHeaderObject_(rowValues);

  const token = payload && payload.token ? String(payload.token) : "";
  const expectedToken = PropertiesService.getScriptProperties().getProperty("APPS_SCRIPT_UPLOAD_TOKEN") || "";
  const canModifyDrive = !expectedToken || token === expectedToken;

  const imageFileId =
    extractDriveFileId_(payload && payload.imageFileId) ||
    extractDriveFileId_(deletedByHeader["Image"]);

  sh.deleteRow(rowNumber);

  let imageDeleted = false;
  if (imageFileId && canModifyDrive) {
    try {
      DriveApp.getFileById(imageFileId).setTrashed(true);
      imageDeleted = true;
    } catch (err) {
      imageDeleted = false;
    }
  }

  return {
    deleted: headerToFriendly_(deletedByHeader),
    imageFileId: imageFileId || "",
    imageDeleted: imageDeleted,
    driveAuthOk: canModifyDrive,
  };
}

/* ----------------- DRIVE: uploadImage ----------------- */

function uploadImage_(payload) {
  const token = payload && payload.token ? String(payload.token) : "";
  const expectedToken = PropertiesService.getScriptProperties().getProperty("APPS_SCRIPT_UPLOAD_TOKEN") || "";
  if (expectedToken && token !== expectedToken) {
    return { ok: false, error: "Forbidden" };
  }

  let folderId = payload && payload.folderId ? String(payload.folderId) : "";
  if (!folderId) {
    const category = String((payload && (payload.category || payload.Category)) || "").trim();
    folderId = folderIdForCategory_(category);
  }
  const data = payload && payload.data ? String(payload.data) : "";
  const mimeType = payload && payload.mimeType ? String(payload.mimeType) : "image/jpeg";
  const fileName = payload && payload.fileName ? String(payload.fileName) : ("vehicle-" + new Date().getTime() + ".jpg");

  if (!folderId) return { ok: false, error: "Missing folderId" };
  if (!data) return { ok: false, error: "Missing data" };

  try {
    const folder = DriveApp.getFolderById(folderId);
    const bytes = Utilities.base64Decode(data);
    const blob = Utilities.newBlob(bytes, mimeType, fileName);
    const file = folder.createFile(blob);

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    const thumbnailUrl = "https://drive.google.com/thumbnail?id=" + encodeURIComponent(fileId) + "&sz=w1000-h1000";

    return {
      ok: true,
      data: {
        fileId: fileId,
        thumbnailUrl: thumbnailUrl,
      },
    };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

function folderIdForCategory_(category) {
  const normalized = String(category || "").trim().toLowerCase();
  if (!normalized) return "";

  if (normalized === "car" || normalized === "cars") return DRIVE_FOLDER_CARS;
  if (normalized === "motorcycle" || normalized === "motorcycles") return DRIVE_FOLDER_MOTORCYCLES;
  if (normalized === "tuktuk" || normalized === "tuk tuk" || normalized === "tuk-tuk") return DRIVE_FOLDER_TUKTUK;

  return "";
}

/* ----------------- CONVERTERS ----------------- */

function rowToHeaderObject_(row) {
  const obj = {};
  HEADERS.forEach(function (h, i) {
    obj[h] = row[i] === undefined ? "" : row[i];
  });
  return obj;
}

function headersToRow_(byHeader) {
  return HEADERS.map(function (h) {
    return byHeader[h] !== undefined ? byHeader[h] : "";
  });
}

function headerToFriendly_(byHeader) {
  return {
    VehicleId: byHeader["VehicleId"],
    Category: byHeader["Category"],
    Brand: byHeader["Brand"],
    Model: byHeader["Model"],
    Year: byHeader["Year"],
    Plate: byHeader["Plate"],
    PriceNew: byHeader["Market Price"],
    Price40: byHeader["D.O.C.1 40%"],
    Price70: byHeader["Vehicle 70%"],
    PriceUsed: byHeader["Price Used"],
    TaxType: byHeader["Tax Type"],
    Condition: byHeader["Condition"],
    BodyType: byHeader["Body Type"],
    Color: byHeader["Color"],
    Image: byHeader["Image"],
    Time: byHeader["Time"],
  };
}

function normalizeToHeaders_(data) {
  const d = data || {};
  const out = {};

  function pickValue_(headerName, friendlyName) {
    if (d[headerName] !== undefined) return d[headerName];
    if (friendlyName && d[friendlyName] !== undefined) return d[friendlyName];
    return "";
  }

  HEADERS.forEach(function (h) {
    if (h === "Market Price") {
      const primary = pickValue_("Market Price", "PriceNew");
      out[h] = primary !== "" ? primary : pickValue_("Price New", "PriceNew");
    } else if (h === "D.O.C.1 40%") {
      const primary = pickValue_("D.O.C.1 40%", "Price40");
      out[h] = primary !== "" ? primary : pickValue_("Price 40%", "Price40");
    } else if (h === "Vehicle 70%") {
      const primary = pickValue_("Vehicle 70%", "Price70");
      if (primary !== "") {
        out[h] = primary;
      } else {
        const legacy = pickValue_("Vihicle 70%", "Price70");
        out[h] = legacy !== "" ? legacy : pickValue_("Price 70%", "Price70");
      }
    }
    else if (h === "Price Used") out[h] = pickValue_("Price Used", "PriceUsed");
    else if (h === "Tax Type") out[h] = pickValue_("Tax Type", "TaxType");
    else if (h === "Body Type") out[h] = pickValue_("Body Type", "BodyType");
    else out[h] = pickValue_(h, h);
  });

  return out;
}

function computeDerivedPrices_(byHeader) {
  const priceNew = toNumber_(byHeader["Market Price"]);
  if (priceNew == null) {
    byHeader["D.O.C.1 40%"] = "";
    byHeader["Vehicle 70%"] = "";
    return;
  }

  byHeader["D.O.C.1 40%"] = roundTo_(priceNew * 0.4, 2);
  byHeader["Vehicle 70%"] = roundTo_(priceNew * 0.7, 2);
}

function toNumber_(value) {
  if (value == null) return null;
  if (typeof value === "number") return isFinite(value) ? value : null;
  const str = String(value).trim();
  if (!str) return null;
  const normalized = str.replace(/,/g, "");
  const n = Number(normalized);
  return isFinite(n) ? n : null;
}

function roundTo_(value, decimals) {
  const d = Math.max(0, Math.min(6, Math.floor(decimals || 0)));
  const factor = Math.pow(10, d);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function extractDriveFileId_(value) {
  if (value == null) return "";
  const raw = String(value).trim();
  if (!raw) return "";

  // If it's already a file id.
  if (/^[a-zA-Z0-9_-]{10,}$/.test(raw)) return raw;

  // Common: ...?id=FILEID
  const idMatch = raw.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (idMatch && idMatch[1]) return idMatch[1];

  // Common: /file/d/FILEID/...
  const pathMatch = raw.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  if (pathMatch && pathMatch[1]) return pathMatch[1];

  // Common: googleusercontent.com/d/FILEID
  const guMatch = raw.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]{10,})/);
  if (guMatch && guMatch[1]) return guMatch[1];

  return "";
}

/* ----------------- RESPONSE ----------------- */

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
