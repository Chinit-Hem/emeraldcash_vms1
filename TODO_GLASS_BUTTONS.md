# Liquid Glass Buttons Upgrade - Replace All Buttons

## Overview
Replace all plain `<button>` elements with `GlassButton` component to apply liquid glass styling throughout the app.

## Files to Update
- [x] `src/app/login/page.tsx` - Show/hide password and submit buttons
- [x] `src/app/components/VehicleList.tsx` - Filter, refresh, print, view/edit/delete buttons
- [x] `src/app/components/VehicleCard.tsx` - View/edit/delete icon buttons
- [x] `src/app/components/ui/GlassToast.tsx` - Close button
- [x] `src/app/components/ui/GlassInput.tsx` - Show/hide password button
- [x] `src/app/components/TopBar.tsx` - Back/menu buttons
- [x] `src/app/components/ThemeToggle.tsx` - Theme toggle button
- [x] `src/app/components/Sidebar.tsx` - Navigation and settings buttons

## Implementation Details
- Add `import { GlassButton } from "@/app/components/ui/GlassButton";` to each file
- Map button types to GlassButton variants:
  - Submit/login buttons → `variant="primary"`
  - Delete buttons → `variant="danger"`
  - Secondary actions → `variant="secondary"`
  - Icon-only buttons → `variant="ghost"`
- Preserve all existing functionality (onClick, type, disabled, etc.)
- Handle special cases like icon buttons carefully

## Testing
- [ ] Test button interactions across all components
- [ ] Verify mobile responsiveness
- [ ] Check for layout shifts due to new button dimensions
- [ ] Ensure accessibility is maintained
