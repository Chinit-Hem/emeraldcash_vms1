/**
 * Database Module - Singleton Pattern Implementation
 * 
 * Refactored to use the DatabaseManager singleton from db-singleton.ts
 * for optimal connection pooling, retry logic, and performance.
 * 
 * This module provides SSR-ready database access with:
 * - Singleton connection management (prevents "too many clients" errors)
 * - Automatic retry logic with exponential backoff
 * - Connection health monitoring
 * - Type-safe query execution
 * 
 * @module db
 */

import { dbManager, sql as singletonSql } from "@/lib/db-singleton";
import type { NeonQueryFunction } from "@neondatabase/serverless";

// ============================================================================
// Type Exports
// ============================================================================

/**
 * Re-export DatabaseManager types for convenience
 */
export type { 
  VehicleFilters, 
  VehicleStats, 
  PaginatedResult, 
  ServiceResult 
} from "@/services/VehicleService";

// ============================================================================
// Singleton Database Access
// ============================================================================

/**
 * SQL template literal function using Singleton DatabaseManager
 * Usage: const result = await sql`SELECT * FROM vehicles WHERE id = ${id}`
 * 
 * This uses the singleton connection to prevent "too many clients" errors
 * and includes automatic retry logic for transient failures.
 */
export const sql = singletonSql;

/**
 * Database manager singleton instance
 * Provides access to advanced features like health checks and statistics
 */
export { dbManager };

/**
 * Get the SQL client directly (for advanced use cases)
 * Uses the singleton DatabaseManager to ensure connection reuse
 */
export function getSqlClient(): NeonQueryFunction<false, false> {
  return dbManager.getClient();
}

// ============================================================================
// Connection Management Utilities
// ============================================================================

/**
 * Test database connection with retry logic
 * Returns detailed success/failure information
 */
export async function testConnection(): Promise<{ success: boolean; message: string }> {
  return dbManager.testConnection();
}

/**
 * Check if database is healthy and responding
 * Fast health check for monitoring and failover
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  return dbManager.isHealthy();
}

/**
 * Get connection statistics for monitoring
 * Includes query counts, success rates, and response times
 */
export function getConnectionStats(): {
  totalQueries: number;
  failedQueries: number;
  successRate: number;
  averageResponseTimeMs: number;
  isHealthy: boolean;
} {
  return dbManager.getStats();
}

/**
 * Reset database connection (useful for error recovery)
 * Clears the current connection and forces re-initialization
 */
export function resetConnection(): void {
  dbManager.resetConnection();
}

/**
 * Execute a query with custom retry options
 * 
 * @param queryFn - Function that executes the database query
 * @param operationName - Name of the operation for logging
 * @param maxRetries - Maximum number of retry attempts
 */
export async function queryWithRetry<T>(
  queryFn: () => Promise<T>,
  operationName?: string,
  maxRetries?: number
): Promise<T> {
  return dbManager.query(queryFn, { operationName, maxRetries });
}

// ============================================================================
// Legacy Compatibility Exports
// ============================================================================

/**
 * Legacy connection stats (for backward compatibility)
 * @deprecated Use getConnectionStats() instead for more detailed metrics
 */
export function getLegacyConnectionStats() {
  return {
    totalQueries: dbManager.getStats().totalQueries,
    failedQueries: dbManager.getStats().failedQueries,
    retriedQueries: 0, // Not tracked separately in new implementation
  };
}

/**
 * Reset legacy connection stats (no-op in new implementation)
 * @deprecated Connection stats are now managed by DatabaseManager
 */
export function resetConnectionStats(): void {
  // No-op: stats are managed internally by DatabaseManager
  console.log("[DB] resetConnectionStats is deprecated, stats managed by DatabaseManager");
}

// ============================================================================
// Default Export
// ============================================================================

/**
 * Default export: SQL template literal function
 * Maintains backward compatibility with existing imports
 * 
 * Usage:
 *   import sql from "@/lib/db";
 *   const result = await sql`SELECT * FROM vehicles`;
 */
export default sql;
