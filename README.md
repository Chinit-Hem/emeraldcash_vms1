## Emerald Cash VMS (Next.js)

This app uses a Google Sheet as the database via a Google Apps Script web app.

## Getting Started

### 1) Configure environment variables

Create (or edit) `.env.local` in the project root (do **not** commit this file):

```bash
# Existing variables
NEXT_PUBLIC_API_URL="https://script.google.com/macros/s/AKfycbwlIp823Km3GEcMhWip_cZSlZ9GRlf1HptIucXdvz2qI14vsn_3Zq_Z27QyblOOLdUuMQ/exec"
SESSION_SECRET="emerald_vms_2026_secure_key_168"

# Add this for image uploads
APPS_SCRIPT_UPLOAD_TOKEN="ya29.a0AWY7CkkJ0xX1z3bX8KfN5JH3kD3VJ8Y2F1bGxjZWRfX2tleV9oZXJl"

# Drive folder links for reference:
# Cars: https://drive.google.com/drive/folders/1UKgtZ_sSNSVy3p-8WBwBrploVL9IDxec?usp=sharing
# Motorcycles: https://drive.google.com/drive/folders/10OcxTtK6ZqQj5cvPMNNIP4VsaVneGiYP?usp=sharing
# Tuk Tuks: https://drive.google.com/drive/folders/18oDOlZXE9JGE5EDZ7yL6oBRVG6SgVYdP?usp=sharing

# Optional: Additional configuration
APPS_SCRIPT_URL="https://script.google.com/macros/s/AKfycbx5SyxFn2NmSeXvh-RAq16upfc4-B0TiGRU7kfldDgXbYQI2WF37ZM-W8RVcVrMFYWcSQ/exec"

```

### 2) Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Demo login

- `admin / 1234` (Admin)
- `staff / 1234` (Staff)

### Admin user management

- Admin can create employee accounts in `Settings`.
- Roles supported: `Admin`, `Staff`.
- You can also pre-seed users via env vars:
  - `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`
  - `STAFF_USERNAME`, `STAFF_PASSWORD_HASH`
  - `AUTH_USERS_JSON` (array of users with bcrypt hashes)

### Apps Script actions expected

- `getVehicles` (GET via query param `?action=getVehicles`)
- `add` (POST JSON: `{ "action": "add", "data": { ... } }`)
- `update` (POST JSON: `{ "action": "update", "id": "<VehicleId>", "data": { ... } }`)
- `delete` (POST JSON: `{ "action": "delete", "id": "<VehicleId>" }`)
- `uploadImage` (POST JSON: `{ "action": "uploadImage", ... }`) *(optional, for file uploads)*

### Google Sheet columns (order matters)

Make sure row 1 in your `Vehicles` sheet uses this column order:

1. `#`
2. `Image`
3. `Category`
4. `Brand`
5. `Model`
6. `Year`
7. `Plate`
8. `MARKET PRICE`
9. `D.O.C.40%`
10. `Vehicles70%`
11. `Tax Type`
12. `Condition`
13. `Body Type`
14. `Color`
15. `Time`

### Drive folders (per Category)

When uploading an image file from the UI, the app will call Apps Script `action=uploadImage` and save the image into the correct Google Drive folder based on `Category`:

- Cars: `1UKgtZ_sSNSVy3p-8WBwBrploVL9IDxec`
- Motorcycles: `10OcxTtK6ZqQj5cvPMNNIP4VsaVneGiYP`
- Tuk Tuk: `18oDOlZXE9JGE5EDZ7yL6oBRVG6SgVYdP`

You can override these defaults in `.env.local` (server-side only):

```bash
DRIVE_FOLDER_CARS="1UKgtZ_sSNSVy3p-8WBwBrploVL9IDxec"
DRIVE_FOLDER_MOTORCYCLES="10OcxTtK6ZqQj5cvPMNNIP4VsaVneGiYP"
DRIVE_FOLDER_TUKTUK="18oDOlZXE9JGE5EDZ7yL6oBRVG6SgVYdP"
```

To secure uploads, set an optional shared token:

```bash
APPS_SCRIPT_UPLOAD_TOKEN="change-me"
```

Then implement `uploadImage` in your Apps Script (see `apps-script/uploadImage.gs`).

### Session security

Set a session signing secret so users cannot change their role by editing cookies (recommended for production deployments):

```bash
SESSION_SECRET="change-me-please-use-a-long-random-string"
```

### Vercel deployment env vars

In Vercel → Project Settings → Environment Variables, set:

- `NEXT_PUBLIC_API_URL`
- `SESSION_SECRET`
- `APPS_SCRIPT_UPLOAD_TOKEN` (required for image uploads)
- `APPS_SCRIPT_URL` (optional; use same URL if you use one Apps Script)

Select **Production + Preview + Development**, then **Redeploy**.

### Delete from Drive too (optional)

When deleting a vehicle from the UI, the app sends `imageFileId` (when available) to Apps Script `action=delete`.

Update your Apps Script delete handler to also move the Drive image to Trash (see `apps-script/deleteVehicleWithImage.gs`).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

