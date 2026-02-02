# TODO: Add button to find data without image and upload image in edit

## Task 1: Add "Find without image" filter in VehicleList
- ✅ Add a `withoutImage` boolean state to filters
- ✅ Add filter button next to existing filter controls
- ✅ Add filter logic to exclude vehicles that have images

## Task 2: Improve image upload UI in edit page for vehicles without images
- ✅ Status: Complete
- Show prominent upload section when vehicle doesn't have an image
- Location: `src/app/(app)/vehicles/[id]/edit/page.tsx`
- Implementation:
  - When no image exists, show a more visible upload area with clear call-to-action
  - Uses amber background with dashed border to draw attention
  - Includes upload icon and instructional text

## Status: All Tasks Complete ✅

