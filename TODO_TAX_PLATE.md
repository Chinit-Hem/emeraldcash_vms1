# TODO: Tax Type and Plate Number Enhancements

## Task: Update Tax Type with static data and add Plate Number validation

### Changes Required:

1. **src/lib/types.ts** ✅
   - [x] Add TaxTypeMetadata interface with descriptions
   - [x] Add TAX_TYPE_METADATA constant with static data
   - [x] Add plate number validation helper
   - [x] Add "Plate Number" to Tax Type options ✅ (DONE)

2. **src/app/(app)/vehicles/add/page.tsx** ✅
   - [x] Add Plate Number auto-uppercase formatting
   - [x] Add Plate Number placeholder examples
   - [x] Enhance Tax Type dropdown with descriptions
   - [x] Add Tax Type input with datalist (allow manual typing) ✅ (DONE)

3. **src/app/(app)/vehicles/[id]/edit/page.tsx** ✅
   - [x] Add Plate Number auto-uppercase formatting
   - [x] Add Plate Number placeholder examples
   - [x] Enhance Tax Type dropdown with descriptions
   - [x] Add Tax Type input with datalist (allow manual typing) ✅ (DONE)

4. **src/app/(app)/vehicles/[id]/view/page.tsx** ✅
   - [x] Add Plate Number uppercase styling
   - [x] Enhance Tax Type display with descriptions

### Tax Type Static Data:
- Tax Paper - Standard tax documentation
- Plate Number - Vehicle with license plate registration
- Standard - Regular vehicle registration
- Luxury - High-end vehicle taxes
- Commercial - Business/commercial vehicles

### Plate Number Format:
- Placeholder: "1A-1234" or "XX-XXXX"
- Auto-uppercase input
- Max length validation

