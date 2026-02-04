# AI Validation Layer Implementation Plan

## Overview
Add AI-powered data validation, auto-fill, and auto-image generation to the Vehicle Management System.

## Files to Create/Modify

### New Files to Create:
1. **src/lib/ai-validator.ts** - Rule-based validation engine
2. **src/lib/auto-image.ts** - Auto-image generation logic
3. **src/app/api/ai/validate/route.ts** - POST endpoint for validation
4. **src/app/api/ai/auto-image/route.ts** - POST endpoint for auto-image generation
5. **src/app/components/AIValidationPanel.tsx** - UI component for validation results

### Files to Modify:
1. **src/app/(app)/vehicles/add/page.tsx** - Add AI Validate/Auto-fill buttons
2. **src/app/(app)/vehicles/[id]/edit/page.tsx** - Add AI Validate/Auto-fill buttons
3. **src/lib/types.ts** - Add validation result types

---

## Implementation Steps

### Step 1: Define Types
Add validation result types to `types.ts`

### Step 2: Create AI Validator Engine
Create `lib/ai-validator.ts` with:
- Required field validation
- Data normalization (trim, case, type conversion)
- Duplicate detection
- Allowed values enforcement
- Price estimation (rule-based)
- Auto-fill suggestions

### Step 3: Create Auto-Image Generator
Create `lib/auto-image.ts` with:
- Generate branded placeholder images (text on canvas)
- Upload to Google Drive
- Return fileId and imageUrl

### Step 4: Create API Endpoints
- `/api/ai/validate` - Returns cleanedData + errors + suggestions
- `/api/ai/auto-image` - Returns {fileId, imageUrl}

### Step 5: Create UI Component
`AIValidationPanel.tsx` for displaying:
- Validation errors (red)
- Auto-fill suggestions (blue)
- Preview diff (original vs cleaned)
- Apply changes button

### Step 6: Update Forms
Add to add/page.tsx and edit/page.tsx:
- "AI Validate" button
- "AI Auto-fill" toggle
- "Auto Image" toggle
- Validation results panel

---

## API Request/Response Shapes

### POST /api/ai/validate

**Request:**
```json
{
  "vehicle": {
    "Category": "cars",
    "Brand": "  Toyota  ",
    "Model": "Camry",
    "Year": "2020",
    "Plate": "ABC-123",
    "PriceNew": 25000,
    "Condition": "used",
    "Color": " WHITE ",
    "BodyType": "Sedan",
    "TaxType": "Standard",
    "Image": ""
  },
  "options": {
    "checkDuplicates": true,
    "existingVehicles": [...] // optional, for duplicate check
  }
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "cleanedData": {
      "Category": "Cars",
      "Brand": "Toyota",
      "Model": "Camry",
      "Year": 2020,
      "Plate": "ABC-123",
      "PriceNew": 25000,
      "Condition": "Used",
      "Color": "White",
      "BodyType": "Sedan",
      "TaxType": "Standard"
    },
    "errors": {
      "Plate": "Plate format may be invalid (expected: XX-XXX format)"
    },
    "suggestions": {
      "BodyType": {
        "value": "Sedan",
        "confidence": 0.95,
        "reason": "Standard body type for Toyota Camry"
      },
      "PriceNew": {
        "value": 22000,
        "confidence": 0.85,
        "reason": "Estimated market price based on similar vehicles"
      }
    },
    "isValid": false,
    "hasDuplicates": false
  }
}
```

### POST /api/ai/auto-image

**Request:**
```json
{
  "category": "Cars",
  "brand": "Toyota",
  "model": "Camry",
  "year": 2020,
  "color": "White",
  "options": {
    "method": "generate" // "generate" or "library"
  }
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "fileId": "1abc123...",
    "imageUrl": "https://drive.google.com/uc?id=1abc123...",
    "method": "generated",
    "previewUrl": "..."
  }
}
```

---

## Data Prevention Strategy

1. **Server-side validation** - All data validated before Google Sheets update
2. **Type coercion** - Fields converted to proper types server-side
3. **Sanitization** - HTML/script injection prevention
4. **Duplicate check** - Prevent same plate/vehicle from being added
5. **Required fields** - Enforced server-side
6. **Allowed values** - Category, Condition, TaxType validated against whitelist
7. **Image validation** - File type/size checks before upload
8. **Audit logging** - Log all validation results and saves

