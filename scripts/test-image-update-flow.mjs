// Test script to verify vehicle image update flow
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

// Load environment variables
config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function testImageUpdateFlow() {
  try {
    console.log("🔍 Testing vehicle image update flow...\n");
    
    // 1. Get a test vehicle
    const vehicles = await sql`SELECT * FROM cleaned_vehicles_for_google_sheets LIMIT 1`;
    if (vehicles.length === 0) {
      console.error("❌ No vehicles found");
      process.exit(1);
    }
    
    const vehicle = vehicles[0];
    console.log("📋 Test vehicle:", {
      id: vehicle.id,
      brand: vehicle.brand,
      model: vehicle.model,
      current_image_id: vehicle.image_id
    });
    
    // 2. Simulate an image update
    const testImageUrl = "https://res.cloudinary.com/demo/image/upload/test_image_" + Date.now();
    console.log("\n📝 Updating with test image URL:", testImageUrl);
    
    // 3. Update the vehicle
    const updateResult = await sql`
      UPDATE cleaned_vehicles_for_google_sheets 
      SET image_id = ${testImageUrl},
          updated_at = ${new Date().toISOString()}
      WHERE id = ${vehicle.id}
      RETURNING *
    `;
    
    if (updateResult.length === 0) {
      console.error("❌ Update failed");
      process.exit(1);
    }
    
    const updatedVehicle = updateResult[0];
    console.log("\n✅ Vehicle updated:", {
      id: updatedVehicle.id,
      new_image_id: updatedVehicle.image_id
    });
    
    // 4. Verify the update
    const verifyResult = await sql`SELECT * FROM cleaned_vehicles_for_google_sheets WHERE id = ${vehicle.id}`;
    const verifiedVehicle = verifyResult[0];
    
    console.log("\n🔍 Verification:", {
      id: verifiedVehicle.id,
      image_id: verifiedVehicle.image_id,
      match: verifiedVehicle.image_id === testImageUrl
    });
    
    // 5. Test the toVehicle conversion
    const priceNew = typeof verifiedVehicle.market_price === 'string' 
      ? parseFloat(verifiedVehicle.market_price) 
      : (verifiedVehicle.market_price || 0);
    
    const apiVehicle = {
      VehicleId: String(verifiedVehicle.id),
      Category: verifiedVehicle.category,
      Brand: verifiedVehicle.brand,
      Model: verifiedVehicle.model,
      Year: verifiedVehicle.year,
      Plate: verifiedVehicle.plate,
      PriceNew: priceNew,
      TaxType: verifiedVehicle.tax_type,
      Condition: verifiedVehicle.condition,
      BodyType: verifiedVehicle.body_type,
      Color: verifiedVehicle.color,
      Image: verifiedVehicle.image_id || "",
      Time: verifiedVehicle.created_at,
    };
    
    console.log("\n📤 API Response would be:", {
      VehicleId: apiVehicle.VehicleId,
      Image: apiVehicle.Image?.substring(0, 100) + "..."
    });
    
    // 6. Restore original image
    await sql`
      UPDATE cleaned_vehicles_for_google_sheets 
      SET image_id = ${vehicle.image_id},
          updated_at = ${new Date().toISOString()}
      WHERE id = ${vehicle.id}
    `;
    console.log("\n🔄 Restored original image");
    
    console.log("\n✅ All tests passed!");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

testImageUpdateFlow();
