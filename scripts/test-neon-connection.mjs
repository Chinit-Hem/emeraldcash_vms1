// Test script to verify Neon PostgreSQL connection
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

// Load environment variables from .env.local
config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;


if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  console.log("\nPlease add the following to your .env.local file:");
  console.log('DATABASE_URL=postgresql://neondb_owner:npg_3XTHYOQhPr9A@ep-little-bar-aij99s0n-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function testConnection() {
  try {
    console.log("🔌 Testing Neon PostgreSQL connection...");
    
    // Test basic connection
    const versionResult = await sql`SELECT version()`;
    console.log("✅ Connected to:", versionResult[0].version);
    
    // Test if cleaned_vehicles_for_google_sheets table exists
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'cleaned_vehicles_for_google_sheets'
    `;
    
    if (tables.length === 0) {
      console.error("❌ Table 'cleaned_vehicles_for_google_sheets' not found");
      console.log("\nAvailable tables:");
      const allTables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;
      allTables.forEach(t => console.log(`  - ${t.table_name}`));
      process.exit(1);
    }
    
    console.log("✅ Table 'cleaned_vehicles_for_google_sheets' exists");
    
    // Test query
    const countResult = await sql`SELECT COUNT(*) as count FROM cleaned_vehicles_for_google_sheets`;
    console.log(`✅ Query successful: ${countResult[0].count} vehicles found`);
    
    // Test sample data
    const sample = await sql`
      SELECT id, category, brand, model, year, plate, market_price 
      FROM cleaned_vehicles_for_google_sheets 
      LIMIT 1
    `;
    
    if (sample.length > 0) {
      console.log("\n📋 Sample vehicle:");
      console.log(`  ID: ${sample[0].id}`);
      console.log(`  Category: ${sample[0].category}`);
      console.log(`  Brand: ${sample[0].brand}`);
      console.log(`  Model: ${sample[0].model}`);
      console.log(`  Year: ${sample[0].year}`);
      console.log(`  Plate: ${sample[0].plate}`);
      console.log(`  Market Price: ${sample[0].market_price}`);
    }
    
    console.log("\n✅ All tests passed! Database connection is working.");
    
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    process.exit(1);
  }
}

testConnection();
