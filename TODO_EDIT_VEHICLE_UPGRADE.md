# Enterprise-Grade Edit/Delete Vehicle Upgrade

## Progress Tracker

### UI Components
- [x] GlassField.tsx - Enterprise form field with stroke-box styling
- [x] SectionCard.tsx - Grouped form section wrapper
- [x] ConfirmDeleteModal.tsx - Bank-grade delete confirmation

### Vehicle Components
- [x] VehicleForm.tsx - Shared form component with all sections
- [x] useVehicle.ts - Single source of truth fetch hook
- [x] useUpdateVehicle.ts - Update mutation hook with toast
- [x] useDeleteVehicle.ts - Delete mutation hook with role guard

### Page Updates
- [x] edit/page.tsx - Complete enterprise rewrite
- [x] view/page.tsx - Enhanced delete modal integration

## Summary

All components have been successfully implemented:

1. **GlassField.tsx** - Enterprise-grade form field with:
   - Stroke-box styling (border-white/20, bg-white/5, shadow-inner)
   - h-11 consistent height
   - Focus ring (ring-emerald-400/60)
   - Error states (border-red-400/60, ring-red-400/40, bg-red-500/5)
   - Accessible labels and ARIA attributes

2. **SectionCard.tsx** - Section wrapper with:
   - GlassCard styling
   - Icon + title header
   - Consistent padding

3. **ConfirmDeleteModal.tsx** - Bank-grade delete safety:
   - Vehicle summary display
   - Text confirmation required (type "DELETE" or plate number)
   - Role-based access control
   - Accessible with keyboard navigation

4. **VehicleForm.tsx** - Complete form component with:
   - 4 sections: Image, Basic Info, Specs, Pricing
   - Client-side price preview (40%/70%)
   - Image upload with URL fallback
   - Validation and error handling
   - Sticky footer with Back/Save buttons

5. **Custom Hooks**:
   - useVehicle: Cache-first fetching with abort controller
   - useUpdateVehicle: PUT request with toast feedback
   - useDeleteVehicle: DELETE request with role guard

6. **Edit Page** - Enterprise layout:
   - max-w-6xl centered container
   - Liquid glass card styling
   - Status chips (Category, Condition, UpdatedTime)
   - Danger zone delete section
   - Toast notifications

7. **View Page** - Enhanced delete flow:
   - Integrated ConfirmDeleteModal
   - Toast feedback
   - 403 permission handling


## Implementation Order
1. Create UI helpers (GlassField, SectionCard)
2. Create ConfirmDeleteModal
3. Create custom hooks (useVehicle, useUpdateVehicle, useDeleteVehicle)
4. Create VehicleForm component
5. Rewrite edit page
6. Update view page delete flow
