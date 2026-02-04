# Cambodia Market Price Feature - Implementation TODO

## Progress: 100% ✅

### ✅ Already Implemented
- [x] Apps Script: `updateMarketPrice_` function + HEADERS columns
- [x] Types: All market price fields in Vehicle type
- [x] Library: Scraping, caching, IQR outlier removal
- [x] API Routes: `/api/market-price/fetch` and `/api/market-price/update`
- [x] UI: `MarketPriceButton` component + View page display

### ✅ Completed in this session

#### 1. Google Apps Script Enhancement ✅
- [x] Add market price fields to `toVehicle()` function
- [x] Add market price fields to `normalizeToHeaders()` function

#### 2. Market Price Library Enhancement ✅  
- [x] Add manual price override capability (`setManualPriceOverride`, `getManualPriceOverride`, `removeManualPriceOverride`)
- [x] Add CSV/JSON import support (`importPricesFromCSV`, `importPricesFromJSON`, `exportPricesToJSON`)
- [x] Enhanced statistics (variance calculation, coefficient of variation, data quality scoring)
- [x] Added helper functions: `getDataQualityColor`, `getDataQualityLabel`, `getConfidenceScore`

#### 3. Edit Page Integration ✅
- [x] Add MarketPriceButton component import
- [x] Add "Auto-update market price when saving" toggle
- [x] Add market price display section with card variant
- [x] Handle price update callback to update local state
- [x] Auto-update logic integrated into handleSave function

#### 4. API Shared Types ✅
- [x] Add market price fields to `toVehicle()` function in `_shared.ts`

---

## Summary of Changes Made

### Files Modified:

1. **apps-script/Code.gs**
   - Updated `headerToFriendly_()` to include market price fields
   - Updated `normalizeToHeaders_()` to handle market price field mappings

2. **src/lib/market-price.ts**
   - Added manual override storage and functions
   - Added CSV/JSON import/export functions
   - Enhanced statistics with variance, stdDev, priceRange
   - Added data quality scoring based on coefficient of variation
   - Added helper functions for data quality display

3. **src/app/(app)/vehicles/[id]/edit/page.tsx**
   - Added MarketPriceButton component import
   - Added `autoUpdateMarketPrice` state
   - Added `marketPriceData` state
   - Added `handleMarketPriceUpdate()` callback handler
   - Added `updateMarketPriceInSheet()` function
   - Added Cambodia Market Price section with card variant
   - Added auto-update toggle checkbox
   - Integrated auto-update logic into handleSave()

4. **src/app/api/vehicles/_shared.ts**
   - Updated `toVehicle()` to parse market price fields from sheet

---

## Usage Instructions

### For Users:
1. Go to Edit Vehicle page
2. Click "Update Price" button in the Cambodia Market Price section
3. Toggle "Auto-update market price when saving" for automatic updates

### For Admins - Manual Override:
```typescript
import { setManualPriceOverride } from '@/lib/market-price';

setManualPriceOverride(
  { category: 'Cars', brand: 'Toyota', model: 'Camry', year: 2020 },
  {
    priceLow: 25000,
    priceMedian: 28000,
    priceHigh: 32000,
    source: 'Manual Entry',
    confidence: 'High',
    updatedBy: 'Admin',
  }
);
```

### For Admins - CSV Import:
```typescript
import { importPricesFromCSV } from '@/lib/market-price';

const csv = `category,brand,model,year,priceLow,priceMedian,priceHigh,source,confidence
Cars,Toyota,Camry,2020,25000,28000,32000,Manual,High
Motorcycles,Honda,Wave,2021,800,1000,1200,CSV Import,Medium`;

const result = importPricesFromCSV(csv);
// result: { success: 2, failed: 0, errors: [] }
```

---

## Next Steps (Optional Enhancements)

1. Create Admin page for bulk price management
2. Add Google Sheets migration function to add new columns
3. Add webhook support for real-time price updates
4. Create manual price entry modal for easy overrides

