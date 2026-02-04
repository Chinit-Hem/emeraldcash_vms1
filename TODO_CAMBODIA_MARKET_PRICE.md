# Cambodia Market Price Feature - Implementation Plan

## Overview
Add a feature to auto-update market prices for vehicles based on REAL Cambodia listing data from local marketplaces like Khmer24.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ Edit Page Button │  │ Toggle (Auto)    │  │ Info Panel   │  │
│  └────────┬─────────┘  └────────┬─────────┘  └───────────────┘  │
└───────────┼────────────────────┼──────────────────┼─────────────┘
            │                    │                  │
            ▼                    ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js API Routes                            │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│  │ POST /api/vehicles/ │  │ GET /api/market-price/fetch     │  │
│  │ [id]/route.ts      │  │ GET /api/market-price/cache      │  │
│  │ (add updateMarket   │  │ POST /api/market-price/update   │  │
│  │  logic)             │  │                                 │  │
│  └─────────────────────┘  └─────────────────────────────────┘  │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Google Apps Script Backend                       │
│  ┌────────────────────┐  ┌─────────────────────────────────┐  │
│  │ Existing Vehicle    │  │ NEW: updateMarketPrice()         │  │
│  │ CRUD Operations    │  │ - Find row by VehicleId          │  │
│  │                    │  │ - Update market price columns    │  │
│  └────────────────────┘  └─────────────────────────────────┘  │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Google Sheets                                 │
│  New Columns Added:                                             │
│  - MARKET_PRICE_LOW    - 25th percentile price                  │
│  - MARKET_PRICE_MEDIAN - Median price                           │
│  - MARKET_PRICE_HIGH   - 75th percentile price                  │
│  - MARKET_PRICE_SOURCE - Domains used for data                  │
│  - MARKET_PRICE_SAMPLES - Number of listings found              │
│  - MARKET_PRICE_UPDATED_AT - Timestamp                          │
│  - MARKET_PRICE_CONFIDENCE - Confidence score (0-1)             │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  External Data Sources                          │
│  - Khmer24.com (cars, motorcycles, tuk-tuks)                    │
│  - Facebook Marketplace (via structured URLs)                   │
│  - Other Cambodian classifieds (if accessible)                  │
│                                                                  │
│  Note: Respects robots.txt, uses caching, no aggressive scraping│
└─────────────────────────────────────────────────────────────────┘
```

---

## New Columns to Add to Google Sheets

Add these columns after the existing `Color` column (before `Time`):

| Column | Type | Description |
|--------|------|-------------|
| MARKET_PRICE_LOW | Number | 25th percentile of market listings |
| MARKET_PRICE_MEDIAN | Number | Median price from listings |
| MARKET_PRICE_HIGH | Number | 75th percentile price |
| MARKET_PRICE_SOURCE | String | Comma-separated sources (e.g., "khmer24.com") |
| MARKET_PRICE_SAMPLES | Number | Count of valid listings used |
| MARKET_PRICE_UPDATED_AT | DateTime | Last update timestamp |
| MARKET_PRICE_CONFIDENCE | String | "High"/"Medium"/"Low" based on sample size |

---

## Implementation Steps

### Phase 1: Apps Script Updates
1. Add new columns to HEADERS array
2. Create `updateMarketPrice()` function
3. Handle row updates with market price fields

### Phase 2: Next.js API Routes
1. Create `/api/market-price/fetch` - Fetch prices from marketplaces
2. Create `/api/market-price/update` - Update Google Sheets
3. Create `/api/market-price/cache` - Cache management

### Phase 3: Price Collection Logic
1. Build web scraper for Khmer24 (respects robots.txt)
2. Implement data cleaning (outlier removal, currency normalization)
3. Calculate percentiles and confidence scores
4. Implement caching layer (in-memory + Google Sheets)

### Phase 4: UI Components
1. Add "Update Market Price" button to Edit page
2. Add "Auto-update market price when saving" toggle
3. Add market price info panel
4. Show price confidence, sources, sample count

### Phase 5: Integration
1. Hook auto-update into save flow
2. Add loading states and async processing
3. Error handling and fallback modes

---

## API Endpoints

### GET /api/market-price/fetch
Fetch market prices for a vehicle from external sources.

**Query Params:**
- `category` (required): Cars, Motorcycles, Tuk Tuk
- `brand` (required): e.g., Toyota
- `model` (required): e.g., Camry
- `year` (optional): e.g., 2020 (uses year range if provided)
- `condition` (optional): New, Used, Damaged

**Response:**
```json
{
  "ok": true,
  "data": {
    "prices": [15000, 16500, 18000, 17500, 15500, 16000],
    "priceLow": 15375,
    "priceMedian": 16300,
    "priceHigh": 17625,
    "sources": ["khmer24.com"],
    "sampleCount": 6,
    "confidence": "Medium",
    "fetchedAt": "2024-01-15T10:30:00Z",
    "cacheHit": false
  }
}
```

### POST /api/market-price/update
Update a vehicle's market price in Google Sheets.

**Request:**
```json
{
  "vehicleId": "123",
  "marketPrice": {
    "low": 15375,
    "median": 16300,
    "high": 17625,
    "source": "khmer24.com",
    "samples": 6,
    "confidence": "Medium"
  }
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "updated": true,
    "vehicleId": "123",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### GET /api/market-price/cache
Get cached prices for a vehicle.

**Response:**
```json
{
  "ok": true,
  "data": {
    "cached": true,
    "cacheExpiresAt": "2024-01-15T14:30:00Z",
    "prices": {...}
  }
}
```

---

## Apps Script Functions to Add

```javascript
// New action for updating market price
function doPost(e) {
  // ... existing actions ...
  
  if (action === "updateMarketPrice") {
    return jsonOut_(updateMarketPrice_(payload));
  }
}

function updateMarketPrice_(payload) {
  const vehicleId = String(payload.vehicleId || "").trim();
  const marketData = payload.marketData || {};
  
  const sh = getSheet_();
  // ... find row by vehicleId ...
  // ... update market price columns ...
}
```

---

## Data Collection Strategy

### Khmer24 Scraping (with policy compliance)
1. Check robots.txt first
2. Use site search URLs with filters
3. Low frequency: max 1 request per minute
4. Cache results for 24 hours

### Sample URLs:
- Cars: `https://www.khmer24.com/en/cars/search?make=Toyota&model=Camry&year=2020`
- Motorcycles: `https://www.khmer24.com/en/motorcycles/search?brand=Honda&model=Wave`

### Data Cleaning:
1. Remove listings without clear prices
2. Remove extreme outliers (>3 IQR from median)
3. Normalize USD currency
4. Handle "Negotiable" → exclude or flag

### Confidence Scoring:
- **High**: 10+ samples, low variance
- **Medium**: 5-9 samples, moderate variance
- **Low**: 1-4 samples or high variance
- **Unknown**: No data found

---

## Caching Strategy

### Cache Tiers:
1. **Memory Cache**: 1 hour (per server instance)
2. **Google Sheets Cache**: 24 hours (stored in script properties)
3. **CDN/Fallback**: None (API-based)

### Cache Key:
```
marketprice:{category}:{brand}:{model}:{year}:{condition}
```

Example: `marketprice:cars:toyota:camry:2020:used`

### Cache Invalidation:
- Auto-expire after 24 hours
- Manual clear via API endpoint
- Force refresh via UI button

---

## UI Components

### Edit Page Integration:
```tsx
// In edit/page.tsx
<button 
  onClick={() => updateMarketPrice()}
  disabled={isUpdatingPrice}
  className="..."
>
  {isUpdatingPrice ? 'Updating...' : 'Update Market Price (Cambodia)'}
</button>

// Toggle for auto-update
<label className="flex items-center gap-2">
  <input 
    type="checkbox" 
    checked={autoUpdateMarketPrice}
    onChange={(e) => setAutoUpdateMarketPrice(e.target.checked)}
  />
  Auto-update market price when saving
</label>

// Info Panel
{marketPrice && (
  <div className="market-price-info">
    <p>Market Price: ${marketPrice.priceMedian.toLocaleString()}</p>
    <p>Range: ${marketPrice.priceLow} - ${marketPrice.priceHigh}</p>
    <p>Confidence: {marketPrice.confidence}</p>
    <p>Sources: {marketPrice.sources.join(', ')}</p>
    <p>Samples: {marketPrice.sampleCount}</p>
    <p>Updated: {formatDate(marketPrice.updatedAt)}</p>
  </div>
)}
```

---

## Fallback Modes

### 1. Manual Price Entry
If price fetching fails, allow manual entry:
```tsx
<button onClick={() => showManualPriceEntry(true)}>
  Enter Market Price Manually
</button>
```

### 2. CSV/JSON Import
Admin can import price data:
```tsx
<button onClick={() => showImportModal(true)}>
  Import Market Prices (CSV/JSON)
</button>
```

### 3. Rule-Based Estimation (Simple)
If no market data available, show estimated range:
```tsx
const estimatePrice = (year, brand) => {
  // Base price by year + brand adjustment
  return {
    low: basePrice * 0.85,
    median: basePrice,
    high: basePrice * 1.15,
    confidence: 'Low - Estimated'
  };
};
```

---

## Compliance & Best Practices

### Website Policy Compliance:
1. Check and respect `robots.txt`
2. Rate limit requests (max 1 per minute per domain)
3. Add User-Agent header identifying the bot
4. Cache aggressively to minimize requests
5. Provide clear attribution to sources

### Error Handling:
1. Network failures → show error, allow retry
2. No data found → show "No market data" message
3. Low confidence → warn user, allow override
4. Scraping blocked → switch to fallback mode

### Logging:
```javascript
// Log all price fetches
console.log({
  timestamp: new Date().toISOString(),
  action: 'fetch_market_price',
  category, brand, model, year,
  result: 'success' | 'no_data' | 'error',
  sampleCount,
  sources,
  cacheHit: true | false
});
```

---

## Files to Create/Modify

### New Files:
1. `apps-script/market-price.gs` - Market price Apps Script functions
2. `src/lib/market-price.ts` - Market price client library
3. `src/app/api/market-price/fetch/route.ts` - Fetch endpoint
4. `src/app/api/market-price/update/route.ts` - Update endpoint
5. `src/app/components/MarketPriceInfo.tsx` - UI component
6. `src/app/components/MarketPriceButton.tsx` - Button component

### Modified Files:
1. `apps-script/Code.gs` - Add updateMarketPrice action
2. `src/app/(app)/vehicles/[id]/edit/page.tsx` - Add button & toggle
3. `src/app/api/vehicles/[id]/route.ts` - Add auto-update logic
4. `src/lib/types.ts` - Add market price types
5. `src/app/(app)/vehicles/[id]/view/page.tsx` - Display market prices

---

## Testing Checklist

- [ ] Fetch prices from Khmer24 (with valid/invalid inputs)
- [ ] Handle rate limiting and errors gracefully
- [ ] Verify caching works (same request returns cached data)
- [ ] Test auto-update toggle (on/off)
- [ ] Verify Google Sheets update writes correct columns
- [ ] Test fallback modes (manual entry, import)
- [ ] Verify confidence scoring logic
- [ ] Test outlier removal with edge cases
- [ ] Verify compliance (robots.txt, rate limiting)

