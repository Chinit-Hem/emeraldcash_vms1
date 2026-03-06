import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    // Test connection
    const versionResult = await sql`SELECT version()`;
    const timeResult = await sql`SELECT NOW() as current_time`;
    
    // Get table information
    const tables = await sql`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    // Get vehicles table schema if it exists
    let vehiclesSchema = null;
    const hasVehicles = tables.some(t => t.table_name === 'vehicles');
    
    if (hasVehicles) {
      const columns = await sql`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = 'vehicles'
        ORDER BY ordinal_position
      `;
      
      const rowCount = await sql`SELECT COUNT(*) as count FROM vehicles`;
      
      vehiclesSchema = {
        columns,
        rowCount: rowCount[0].count
      };
    }

    return NextResponse.json({
      success: true,
      database: {
        version: versionResult[0].version,
        currentTime: timeResult[0].current_time,
        tables: tables,
        vehicles: vehiclesSchema
      }
    });
    
  } catch (error) {
    console.error("Database test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
