# Vehicle Loading Error Fix Plan

## Information Gathered
- Vehicles page (`VehiclesClient.tsx`) fetches directly using `fetch("/api/vehicles")` without robust error handling
- Existing API client (`lib/api.ts`) has some error handling but not used in vehicles page
- Auth uses cookies, not localStorage
- API returns `{ ok: true, data: vehicles, meta }` or `{ ok: false, error }`
- No environment variable validation for NEXT_PUBLIC_API_URL
- No auth header handling in client requests
- Response shape normalization needed (API returns either `{ data, meta }` or `Vehicle[]`)

## Plan
1. **Update API client (`lib/api.ts`)**:
   - Add `fetchJSON()` with 15s timeout + AbortController
   - Add dev-only logging of URL, status, response text
   - Handle 401 (redirect to /login, clear token), 403/404/500 with user-friendly messages
   - Handle non-JSON responses
   - Add auth header support (Authorization: Bearer <token>)
   - Add runtime check for NEXT_PUBLIC_API_URL

2. **Update vehicles fetch hook**:
   - Create `useVehicles` hook using the robust API client
   - Handle loading/success/error states
   - Normalize response shapes ({ data, meta } or Vehicle[])
   - Add retry functionality

3. **Update vehicles page**:
   - Use new `useVehicles` hook
   - Show exact error in dev mode
   - Ensure UI shows 0 only when request fails, not when loading

## Dependent Files to be edited
- `src/lib/api.ts` - Add robust fetchJSON wrapper
- `src/app/(app)/vehicles/VehiclesClient.tsx` - Update to use new hook
- `src/lib/auth.ts` - Add token management functions

## Followup steps
- Test API client with various error scenarios
- Verify auth flow works correctly
- Check environment variable setup
