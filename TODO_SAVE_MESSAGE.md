# Save Feedback Fix

## Task
- Fix save feedback so users know data is being saved
- Prevent double-clicking save button

## Issues
1. Edit page: `saving` state is defined but never set to `true`
2. Add page: No protection against multiple submit clicks

## Changes Made
1. **Edit page (src/app/(app)/vehicles/[id]/edit/page.tsx)**:
   - Added `setSaving(true)` at start of `handleSave` function
   - Added `setSaving(false)` in finally block

2. **Add page (src/app/(app)/vehicles/add/page.tsx)**:
   - Added `submitting` state
   - Set `submitting = true` at start of form submission
   - Set `submitting = false` in finally block
   - Disabled submit button while `submitting` is true
   - Button shows "Adding..." while submitting

## Status: ✅ Completed

