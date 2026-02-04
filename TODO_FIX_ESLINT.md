# ESLint Unused Variables Fix Plan

## Issues Identified

### 1. src/app/(app)/vehicles/add/page.tsx
- **Lines 22:10, 22:19**: `loading` and `setLoading` are declared but never used
- **Fix**: Remove the unused `loading` state variable ✅ DONE

### 2. src/app/api/vehicles/[id]/delete-image/route.ts
- **Line 30:11**: `id` is assigned from params but never used
- **Fix**: Removed unused params from function signature ✅ DONE

### 3. src/app/api/vehicles/[id]/route.ts
- **Lines 184:9, 192:9**: `safePart` and `extensionFromMimeType` functions are defined but never used
- **Fix**: Remove the unused helper functions ✅ DONE

### 4. src/app/api/vehicles/route.ts
- **Line 169:9**: `uploadedImageFile` is assigned but never used
- **Fix**: Remove the unused variable ✅ DONE

### 5. src/app/components/VehicleList.tsx
- **Lines 143:10, 147:10**: `isRefreshing` and `hasLoadedFromCache` states are declared but never used
- **Line 372:6**: `useMemo` has missing dependency `optimisticUpdates`
- **Fix**: Remove unused states and add missing dependency ✅ DONE

## Implementation Order
- [x] Add page.tsx fix
- [x] delete-image/route.ts fix
- [x] [id]/route.ts fix
- [x] route.ts fix
- [x] VehicleList.tsx fix
- [x] Run ESLint to verify

## Status: ALL FIXED ✅
All 9 ESLint warnings have been resolved:
- 2 unused variables in add/page.tsx
- 1 unused variable in delete-image/route.ts
- 2 unused functions in [id]/route.ts
- 1 unused variable in route.ts
- 2 unused states + 1 missing dependency in VehicleList.tsx

