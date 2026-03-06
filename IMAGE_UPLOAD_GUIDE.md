# Cloudinary Image Upload Guide

## Your Cloudinary Setup
- **Cloud Name**: `dgntrakv6`
- **API Key**: `451223545965496`
- **Folders Created**: 
  - `CarsVMS` - For Cars, SUVs, Sedans, Trucks
  - `MotorcyclesVMS` - For Motorcycles, Scooters, Bikes
  - `TukTuksVMS` - For TukTuks, Auto Rickshaws

## Folder Links
- **CarsVMS**: https://console.cloudinary.com/app/c-e2b60edd4b863da4f82a3c9f5157e9/assets/media_library/folders/ce555092908976deefcf5144e334d91fa5
- **MotorcyclesVMS**: https://console.cloudinary.com/app/c-e2b60edd4b863da4f82a3c9f5157e9/assets/media_library/folders/ce5550c3538940f637816b763306aeb17b
- **TukTuksVMS**: https://console.cloudinary.com/app/c-e2b60edd4b863da4f82a3c9f5157e9/assets/media_library/folders/ce55505c300960c23aff469967deea2277

## Quick Upload Command

```bash
# Set environment variables and run upload
$env:CLOUDINARY_URL="cloudinary://451223545965496:9WNuYMzGCDjif2b96IgyS1HS8kQ@dgntrakv6"; $env:DATABASE_URL="postgresql://neondb_owner:npg_3XTHYOQhPr9A@ep-little-bar-aij99s0n-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"; node scripts/upload-to-folder.mjs ./your-image.jpg VH001 SUV
```

## Step-by-Step Instructions

### 1. Place Your Image
Copy your vehicle image to the project folder (e.g., `D:\emeraldcash_vms_next`)

### 2. Upload Using Simple Command
```bash
node scripts/upload-to-folder.mjs <image-path> <vehicle-id> <category>
```

**Examples:**
```bash
# Upload car/SUV image → goes to CarsVMS folder
node scripts/upload-to-folder.mjs ./toyota-landcruiser.jpg VH001 SUV

# Upload motorcycle image → goes to MotorcyclesVMS folder
node scripts/upload-to-folder.mjs ./honda-scoopy.jpg VH004 Motorcycle

# Upload tuk-tuk image → goes to TukTuksVMS folder
node scripts/upload-to-folder.mjs ./tuk-tuk-2024.jpg VH005 TukTuk
```

### 3. Check Upload Result
The script will output:
- ✅ Upload success message
- 🔗 Image URL (save this!)
- 📁 Which folder it was uploaded to
- ✅ Database update confirmation

## How It Works

1. **Uploads to Cloudinary** → Image stored in correct folder based on category
2. **Saves URL to Database** → Vehicle record updated with image URL
3. **Returns Public URL** → You can use this URL anywhere

## Category to Folder Mapping

| Vehicle Category | Cloudinary Folder | Link |
|-----------------|-------------------|------|
| SUV, Car, Sedan, Truck, Pickup, Van, Jeep | `CarsVMS` | [View Folder](https://console.cloudinary.com/app/c-e2b60edd4b863da4f82a3c9f5157e9/assets/media_library/folders/ce555092908976deefcf5144e334d91fa5) |
| Motorcycle, Motorbike, Scooter, Moped | `MotorcyclesVMS` | [View Folder](https://console.cloudinary.com/app/c-e2b60edd4b863da4f82a3c9f5157e9/assets/media_library/folders/ce5550c3538940f637816b763306aeb17b) |
| TukTuk, Auto Rickshaw, Three Wheeler | `TukTuksVMS` | [View Folder](https://console.cloudinary.com/app/c-e2b60edd4b863da4f82a3c9f5157e9/assets/media_library/folders/ce55505c300960c23aff469967deea2277) |

## View Uploaded Images

```bash
# List all images in your folders
$env:CLOUDINARY_URL="cloudinary://451223545965496:9WNuYMzGCDjif2b96IgyS1HS8kQ@dgntrakv6"; node scripts/upload-vehicle-images.mjs
```

## View Vehicles with Images

```bash
# Show all vehicles and their image URLs
$env:DATABASE_URL="postgresql://neondb_owner:npg_3XTHYOQhPr9A@ep-little-bar-aij99s0n-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"; node scripts/get-vehicles-data.mjs
```

## API Integration

When you add a vehicle through the API with an image:

```javascript
// POST /api/vehicles
{
  "VehicleId": "VH006",
  "Category": "SUV",        // ← This determines the folder (CarsVMS)
  "Brand": "Lexus",
  "Model": "RX350",
  "Year": 2024,
  "Image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..." // Base64 image
}
```

The API will:
1. Detect category "SUV" → Upload to `CarsVMS` folder
2. Save the Cloudinary URL to database
3. Return the vehicle with image URL

## Image URL Format

After upload, your images will be accessible at:
```
https://res.cloudinary.com/dgntrakv6/image/upload/v1234567890/CarsVMS/VH001_1234567890.jpg
```

## Need Help?

Run the upload script without arguments to see help:
```bash
node scripts/upload-to-folder.mjs
