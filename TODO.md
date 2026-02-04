# TODO - Emerald Cash Login Fix

## Issue: "Invalid username/password" Error

### Root Cause
The username was NOT being normalized to lowercase when checking against DEMO_USERS. This caused login failures when users typed "Admin", "ADMIN", or any mixed case variation.

### Fix Applied
- [x] 1. Fix `getUserConfig()` function to normalize username to lowercase when checking DEMO_USERS
- [x] 2. Fixed environment variable lookup to use normalized username

## Files Modified
- `src/app/api/auth/login/route.ts` - Fixed username case normalization

## Testing Checklist
- [x] Login with "admin" (lowercase) - should work
- [x] Login with "Admin" (mixed case) - should now work
- [x] Login with "ADMIN" (uppercase) - should now work
- [x] Login with "staff" (lowercase) - should work
- [x] Login with "Staff" (mixed case) - should now work

---

## ✅ FIX COMPLETED

### Changes Made:
1. Normalized username to lowercase at the beginning of `getUserConfig()` function
2. Used normalized username for:
   - Environment variable lookup (`ADMIN_USERNAME`, `STAFF_USERNAME`, etc.)
   - Role detection ("admin" in username → Admin role)
   - DEMO_USERS lookup (case-insensitive)

### What This Fixes:
- **Before**: Only "admin" worked (case-sensitive)
- **After**: "admin", "Admin", "ADMIN" all work (case-insensitive)

### Demo Credentials (All case variations now work):
- **Username:** `admin` or `Admin` or `ADMIN`
- **Password:** `1234`

- **Username:** `staff` or `Staff` or `STAFF`
- **Password:** `1234`

