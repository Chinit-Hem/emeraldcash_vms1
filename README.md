## Emerald Cash VMS (Next.js)

This app uses a Google Sheet as the database via a Google Apps Script web app.

## Getting Started

### 1) Configure the Google Apps Script URL

Create (or edit) `.env.local` in the project root:

```bash
NEXT_PUBLIC_API_URL="https://script.google.com/macros/s/<YOUR_SCRIPT_ID>/exec"
```

### 2) Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Demo login

- `admin / 1234` (Admin)
- `staff / 1234` (Staff)

### Apps Script actions expected

- `getVehicles` (GET via query param `?action=getVehicles`)
- `add` (POST JSON: `{ "action": "add", "data": { ... } }`)
- `update` (POST JSON: `{ "action": "update", "id": "<VehicleId>", "data": { ... } }`)
- `delete` (POST JSON: `{ "action": "delete", "id": "<VehicleId>" }`)
- `uploadImage` (POST JSON: `{ "action": "uploadImage", ... }`) *(optional, for file uploads)*

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
