# Vehicle Detail Page + Edit Form Upgrade - Implementation Tracker

## Phase 1: Utility Files
- [x] Create `src/lib/format.ts` - Currency and date formatting utilities
  - [x] formatCurrency() - Intl.NumberFormat for USD
  - [x] formatDateCambodia() - YYYY-MM-DD HH:mm:ss format
  - [x] formatVehicleDate() - Wrapper for vehicle time display

## Phase 2: UI Components
- [x] Create `src/app/components/ui/ConfirmDialog.tsx`
  - [x] Glass card styling with liquid effect
  - [x] Title, message, confirm/cancel buttons
  - [x] Danger variant for delete operations
  - [x] Responsive sizing

- [x] Create `src/app/components/vehicles/VehicleDetailsCard.tsx`
  - [x] Desktop: Two-column layout (image left, details right)
  - [x] Mobile: Single column with sticky bottom action bar
  - [x] Liquid glass styling throughout
  - [x] Header with Back button, title, category badge
  - [x] Main identity: Brand + Model large, Plate smaller, Vehicle ID subtle
  - [x] Information grid: Category, Plate, Year, Color, Condition, BodyType, TaxType
  - [x] Price cards: Market Price, DOC 40%, Vehicles 70%
  - [x] Added Time formatted Cambodia timezone
  - [x] Image click opens fullscreen preview
  - [x] Elegant placeholder for no image
  - [x] Permission-based action buttons (Edit/Delete/Back)

- [x] Create `src/app/components/vehicles/EditVehicleModal.tsx`
  - [x] react-hook-form + zod validation setup
  - [x] Form sections:
    - [x] Basic Info (Category, Brand, Model, Plate, Year, Color, Condition, BodyType, TaxType)
    - [x] Pricing (Market Price auto-calc 40% + 70%)
    - [x] Image Upload (preview, replace, remove, URL option)
    - [x] Meta info (created time read-only)
  - [x] Validation errors display
  - [x] Save button with loading state
  - [x] Toast success/error messages
  - [x] Prevent closing if unsaved changes
  - [x] Mobile: Full-screen modal with sticky Save/Cancel bar

## Phase 3: Page Updates
- [x] Update `src/app/(app)/vehicles/[id]/page.tsx`
  - [x] Use new VehicleDetailsCard component
  - [x] Implement permission checks (Admin/Staff/Viewer)
  - [x] Add loading skeleton
  - [x] Add error retry state
  - [x] Responsive layout handling

- [x] Update `src/app/(app)/vehicles/[id]/edit/page.tsx`
  - [x] Use new EditVehicleModal component
  - [x] Maintain existing navigation features
  - [x] Add liquid glass styling
  - [x] Mobile-responsive layout


## Phase 4: Integration & Testing
- [ ] Ensure all imports work correctly
- [ ] Verify responsive behavior on mobile/tablet/desktop
- [ ] Test permission-based UI hiding
- [ ] Test image preview functionality
- [ ] Test form validation and submission
- [ ] Verify Cambodia timezone formatting
- [ ] Check dark mode compatibility

## Acceptance Criteria Checklist
- [ ] Works on mobile without reload issue
- [ ] Edit updates UI instantly
- [ ] Delete requires confirmation
- [ ] Image preview works
- [ ] Professional premium UI consistent with Emerald Cash brand
- [ ] Permission system working (Admin/Staff/Viewer)
- [ ] All prices formatted correctly
- [ ] All dates in Cambodia timezone format
