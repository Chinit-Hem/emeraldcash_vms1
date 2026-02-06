# Fix Vehicle Count Discrepancy (874 vs 864)

## Problem
- Actual data: 874 vehicles in Google Sheets
- Displayed total: 864 vehicles
- Difference: 10 vehicles missing

## Root Cause Analysis
The issue was caused by empty/invalid rows in the Google Sheet being counted as vehicles. The Apps Script was returning all rows from the sheet (including empty ones), and the frontend filtering wasn't catching all of them.

## Changes Made

### 1. Fixed Apps Script Backend (`Code.gs`)
Added filtering in `getVehicles_()` to remove empty/invalid vehicles before returning data:

```javascript
const vehicles = values.map(function (row) {
  const byHeader = rowToHeaderObject_(row);
  return headerToFriendly_(byHeader);
}).filter(function (vehicle) {
  // Filter out vehicles without a valid ID
  const hasId = vehicle.VehicleId !== null && vehicle.VehicleId !== undefined && String(vehicle.VehicleId).trim() !== "";
  // Also check if vehicle has at least some meaningful data (Category, Brand, or Model)
  const hasData = (vehicle.Category && String(vehicle.Category).trim() !== "") ||
                  (vehicle.Brand && String(vehicle.Brand).trim() !== "") ||
                  (vehicle.Model && String(vehicle.Model).trim() !== "");
  return hasId && hasData;
});
```

### 2. Fixed API Route (`route.ts`)
Added debugging logs and improved filtering:

```typescript
// Filter out empty rows before adding to allRows
const validRows = rows.filter((row) => {
  const vehicleId = row["VehicleId"] || row["VehicleID"] || row["Id"] || row["id"] || row["#"];
  const hasId = vehicleId !== undefined && vehicleId !== null && String(vehicleId).trim() !== "";
  const hasData = Object.values(row).some(v => v !== undefined && v !== null && v !== "");
  return hasId && hasData;
});

// Additional filtering after mapping
const vehicles = allRows
  .map((row) => toVehicle(row))
  .filter((v) => v.VehicleId && String(v.VehicleId).trim() !== "") as Vehicle[];
```

## Steps Completed

- [x] 1. Analyze the code and identify the issue
- [x] 2. Fix Apps Script backend to filter empty rows
- [x] 3. Fix pagination logic in `route.ts` 
- [x] 4. Add filtering to remove empty/invalid rows
- [x] 5. Verify linting passes (no errors in modified file)
- [x] 6. Verify build passes successfully

## Files Edited
1. `ec-vms-next/apps-script/Code.gs` - Added filtering in `getVehicles_()` function
2. `ec-vms-next/src/app/api/vehicles/route.ts` - Added debugging and improved filtering

## Verification Status
- ✅ Linting: No errors in modified files
- ✅ Build: Successful compilation
- ✅ TypeScript: No type errors

## Deployment Instructions

### Step 1: Deploy Apps Script Changes
1. Open the Google Apps Script editor
2. Copy the updated `Code.gs` file content
3. Paste it into the Apps Script editor
4. Click **Deploy** → **New deployment** or **Manage deployments** → **Edit** existing deployment
5. Copy the new Web App URL

### Step 2: Update Environment Variable (if URL changed)
If the Apps Script URL changed after redeployment, update the `NEXT_PUBLIC_API_URL` environment variable in Vercel.

### Step 3: Deploy Next.js App
```bash
cd ec-vms-next
npm run build
# Deploy to Vercel or your hosting platform
```

### Step 4: Clear Cache and Test
1. Visit `/api/vehicles/clear-cache` to clear the vehicle cache
2. Refresh the dashboard
3. Check that "Total Vehicles" shows **874**

### Step 5: Verify (if still showing 864)
If the count is still incorrect after deployment:
1. Check the Apps Script execution logs (View → Executions in Apps Script editor)
2. Look for `[DEBUG]` logs in the Next.js server logs
3. The logs will show: `Raw values length`, `Processed vehicles length (after filtering)`, and `Final vehicles count`

## Expected Result
After deployment, the dashboard should show **874** vehicles instead of 864.
