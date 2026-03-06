import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function checkTable() {
  try {
    console.log("🔍 Checking cleaned_vehicles_for_google_sheets table...\n");
    
    // Check if table exists
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'cleaned_vehicles_for_google_sheets'
    `;
    
    if (tables.length === 0) {
      console.log("❌ Table does not exist yet");
      console.log("\nCreating table...");
      
      // Create the table
      await sql`
        CREATE TABLE IF NOT EXISTS cleaned_vehicles_for_google_sheets (
          id SERIAL PRIMARY KEY,
          vehicle_id VARCHAR(50),
          category VARCHAR(50),
          brand VARCHAR(100),
          model VARCHAR(100),
          year INTEGER,
          plate VARCHAR(20),
          price_new DECIMAL(12, 2),
          price_40 DECIMAL(12, 2),
          price_70 DECIMAL(12, 2),
          tax_type VARCHAR(50),
          condition VARCHAR(20),
          body_type VARCHAR(50),
          color VARCHAR(50),
          image TEXT,
          time VARCHAR(50),
          market_price_low DECIMAL(12, 2),
          market_price_median DECIMAL(12, 2),
          market_price_high DECIMAL(12, 2),
          market_price_source VARCHAR(100),
          market_price_samples INTEGER,
          market_price_updated_at VARCHAR(50),
          market_price_confidence VARCHAR(20),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      console.log("✅ Table created: cleaned_vehicles_for_google_sheets");
    } else {
      console.log("✅ Table exists: cleaned_vehicles_for_google_sheets");
    }
    
    // Get column info
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'cleaned_vehicles_for_google_sheets'
      ORDER BY ordinal_position
    `;
    
    console.log(`\n📋 Columns (${columns.length}):`);
    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    // Get row count
    const countResult = await sql`SELECT COUNT(*) as count FROM cleaned_vehicles_for_google_sheets`;
    const count = parseInt(countResult[0].count);
    console.log(`\n📊 Total rows: ${count}`);
    
    // Get sample data
    if (count > 0) {
      const data = await sql`SELECT * FROM cleaned_vehicles_for_google_sheets LIMIT 3`;
      console.log("\n📝 Sample data:");
      data.forEach((row, i) => {
        console.log(`\n   Row ${i + 1}:`);
        Object.entries(row).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            console.log(`      ${key}: ${value}`);
          }
        });
      });
    } else {
      console.log("\n⚠️  Table is empty - no data yet");
    }
    
    console.log("\n✅ Check complete!");
    
  } catch (err) {
    console.error("\n❌ Error:", err.message);
    process.exit(1);
  }
}

checkTable();
