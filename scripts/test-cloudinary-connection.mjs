import { config } from "dotenv";
import { v2 as cloudinary } from "cloudinary";

config({ path: ".env.local" });

const CLOUDINARY_URL = process.env.CLOUDINARY_URL;

console.log("🔍 Checking Cloudinary Configuration...\n");

if (!CLOUDINARY_URL) {
  console.error("❌ CLOUDINARY_URL environment variable is not set");
  console.log("\nPlease add the following to your .env.local file:");
  console.log('CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME');
  process.exit(1);
}

// Parse Cloudinary URL
// Format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
const urlMatch = CLOUDINARY_URL.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);

if (!urlMatch) {
  console.error("❌ Invalid CLOUDINARY_URL format");
  console.log("Expected format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME");
  process.exit(1);
}

const [, apiKey, apiSecret, cloudName] = urlMatch;

console.log("✅ Cloudinary URL parsed successfully");
console.log(`   Cloud Name: ${cloudName}`);
console.log(`   API Key: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);

// Configure Cloudinary
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

// Test connection
async function testConnection() {
  try {
    console.log("\n🔌 Testing Cloudinary connection...");
    const result = await cloudinary.api.ping();
    console.log("✅ Cloudinary connection successful!");
    
    // Get account info
    console.log("\n📋 Fetching account info...");
    const account = await cloudinary.api.usage();
    console.log(`   Plan: ${account.plan}`);
    console.log(`   Last updated: ${account.last_updated}`);
    
    // List folders
    console.log("\n📁 Checking folders...");
    try {
      const folders = await cloudinary.api.root_folders();
      console.log("   Available root folders:");
      folders.folders.forEach(folder => {
        console.log(`   - ${folder.name} (${folder.path})`);
      });
    } catch (folderError) {
      console.log("   Could not list folders (may require admin permissions)");
    }
    
    return true;
  } catch (error) {
    console.error("❌ Cloudinary connection failed:", error.message);
    return false;
  }
}

// Test upload to specific folder
async function testUpload() {
  // Create a simple 1x1 pixel transparent PNG as base64
  const testImageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  
  const folders = ["CarsVMS", "MotorcyclesVMS", "TukTuksVMS"];
  
  for (const folder of folders) {
    try {
      console.log(`\n📤 Testing upload to folder: ${folder}`);
      const result = await cloudinary.uploader.upload(testImageBase64, {
        folder: folder,
        public_id: `test_${Date.now()}`,
        resource_type: "image",
      });
      
      console.log(`✅ Upload successful!`);
      console.log(`   Public ID: ${result.public_id}`);
      console.log(`   URL: ${result.secure_url}`);
      
      // Clean up - delete the test image
      console.log(`   🗑️  Cleaning up test image...`);
      await cloudinary.uploader.destroy(result.public_id);
      console.log(`   ✅ Test image deleted`);
      
    } catch (error) {
      console.error(`❌ Upload to ${folder} failed:`, error.message);
    }
  }
}

async function main() {
  const connected = await testConnection();
  if (connected) {
    await testUpload();
    console.log("\n✅ All tests completed!");
  } else {
    console.log("\n❌ Connection test failed. Please check your CLOUDINARY_URL.");
  }
}

main();
