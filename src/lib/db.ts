import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create a SQL client using the Neon serverless driver
const sql = neon(DATABASE_URL);

// Export as both default and named export for compatibility
export { sql };
export default sql;

// Test connection function
export async function testConnection(): Promise<{ success: boolean; message: string }> {

  try {
    const result = await sql`SELECT version()`;
    return {
      success: true,
      message: `Connected to PostgreSQL: ${result[0].version}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown connection error",
    };
  }
}

// Helper function to check if database is accessible
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
