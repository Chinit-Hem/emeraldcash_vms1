# Cambodia Market Price Implementation

## Status: In Progress

---

## Phase 1: Types & Library ✅

### 1.1. Update Types
- [x] Add MarketPriceData type to src/lib/types.ts

### 1.2. Create Market Price Library  
- [x] Create src/lib/market-price.ts with:
  - fetchMarketPrices() function
  - calculatePriceRange() function
  - confidence scoring
  - caching logic (1 hour TTL)

---

## Phase 2: API Endpoints ✅

### 2.1. Fetch Endpoint
- [x] Create src/app/api/market-price/fetch/route.ts

### 2.2. Update Endpoint  
- [x] Create src/app/api/market-price/update/route.ts

### 2.3. Cache Endpoint
- [x] (Optional - cache is in-memory, handled by library)

---

## Phase 3: Apps Script Updates ✅

### 3.1. Add New Columns
- [x] Update HEADERS array in apps-script/Code.gs

### 3.2. Add Update Function
- [x] Add updateMarketPrice_() function
- [x] Add updateMarketPrice action to doPost

---

## Phase 4: UI Components ✅

### 4.1. Market Price Button
- [x] Create src/app/components/MarketPriceButton.tsx

### 4.2. View Page Market Price Display
- [x] Add market price section to view/page.tsx

---

## Phase 5: Integration (In Progress)

### 5.1. Update Edit Page
- [ ] Add MarketPriceButton component
- [ ] Add auto-update toggle
- [ ] Add MarketPriceInfo panel

### 5.2. _shared.ts Updates
- [ ] Add market price fields to toVehicle() parsing

---

## Phase 6: Testing & Validation

- [ ] Test API endpoints
- [ ] Verify Google Sheets integration
- [ ] Test UI components
- [ ] Verify compliance (rate limiting, caching)

---

## Files Created/Modified

### New Files:
- `src/lib/market-price.ts` - Market price library
- `src/app/api/market-price/fetch/route.ts` - Fetch prices API
- `src/app/api/market-price/update/route.ts` - Update prices API
- `src/app/components/MarketPriceButton.tsx` - UI button component

### Modified Files:
- `src/lib/types.ts` - Added market price fields
- `src/app/(app)/vehicles/[id]/view/page.tsx` - Added market price display
- `apps-script/Code.gs` - Added updateMarketPrice action & columns

---

## Google Sheets Column Setup

After deploying the Apps Script update, add these columns to your "Vehicles" sheet:

| Column | Description |
|--------|-------------|
| MARKET_PRICE_LOW | 25th percentile price |
| MARKET_PRICE_MEDIAN | Median price |
| MARKET_PRICE_HIGH | 75th percentile price |
| MARKET_PRICE_SOURCE | Data source (e.g., khmer24.com) |
| MARKET_PRICE_SAMPLES | Number of listings |
| MARKET_PRICE_CONFIDENCE | High/Medium/Low |
| MARKET_PRICE_UPDATED_AT | Timestamp |

**Note:** These columns should be added AFTER "Color" and BEFORE "Time" in the sheet.

