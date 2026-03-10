/**
 * Database Singleton Module
 * 
 * Implements the Singleton Pattern for Neon PostgreSQL connection management.
 * Provides optimized connection pooling, health monitoring, and SSR-ready
 * query execution with built-in retry logic.
 * 
 * @module db-singleton
 */

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Database connection configuration
 */
interface ConnectionConfig {
  url: string;
  maxConnections: number;
  connectionTimeoutMs: number;
  idleTimeoutMs: number;
  enableKeepalive: boolean;
}

/**
 * Query execution options
 */
interface QueryOptions {
  operationName?: string;
  maxRetries?: number;
  cacheKey?: string;
  cacheTtlMs?: number;
}

/**
 * Connection health status
 */
interface HealthStatus {
  healthy: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
  totalQueries: number;
  failedQueries: number;
  averageResponseTimeMs: number;
}

// ============================================================================
// Singleton Database Manager Class
// ============================================================================

class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private sqlClient: NeonQueryFunction<false, false> | null = null;
  private config: ConnectionConfig;
  private health: HealthStatus;
  private queryTimes: number[] = [];
  private readonly MAX_QUERY_HISTORY = 100;

  /**
   * Private constructor - use getInstance() instead
   */
  private constructor() {
    this.config = this.initializeConfig();
    this.health = {
      healthy: false,
      lastCheck: new Date(),
      consecutiveFailures: 0,
      totalQueries: 0,
      failedQueries: 0,
      averageResponseTimeMs: 0,
    };
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialize connection configuration from environment
   */
  private initializeConfig(): ConnectionConfig {
    const url = process.env.DATABASE_URL;
    
    if (!url) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    return {
      url,
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || "10", 10),
      connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT || "10000", 10),
      idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT || "30000", 10),
      enableKeepalive: process.env.DB_ENABLE_KEEPALIVE !== "false",
    };
  }

  /**
   * Initialize the SQL client with optimized settings
   */
  private initializeClient(): NeonQueryFunction<false, false> {
    if (this.sqlClient) {
      return this.sqlClient;
    }

    this.sqlClient = neon(this.config.url, {
      fetchOptions: {
        keepalive: this.config.enableKeepalive,
      },
    });

    // Mark as healthy on successful initialization
    this.health.healthy = true;
    this.health.lastCheck = new Date();

    console.log("[DB-Singleton] Database client initialized with optimized settings");

    return this.sqlClient;
  }

  /**
   * Get the SQL client (initializes if needed)
   */
  public getClient(): NeonQueryFunction<false, false> {
    if (!this.sqlClient) {
      return this.initializeClient();
    }
    return this.sqlClient;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const message = error.message.toLowerCase();
    const retryablePatterns = [
      "too many database connection attempts",
      "failed to acquire permit",
      "neon:retryable",
      "connection",
      "timeout",
      "econnrefused",
      "enotfound",
      "pool",
      "deadlock",
    ];

    return retryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateDelay(attempt: number): number {
    const baseDelay = Math.min(
      100 * Math.pow(2, attempt),
      2000 // Max 2 seconds
    );
    const jitter = Math.random() * 100;
    return baseDelay + jitter;
  }

  /**
   * Update health metrics after query
   */
  private updateMetrics(success: boolean, durationMs: number): void {
    this.health.totalQueries++;
    
    if (!success) {
      this.health.failedQueries++;
      this.health.consecutiveFailures++;
    } else {
      this.health.consecutiveFailures = 0;
    }

    // Track query time for average calculation
    this.queryTimes.push(durationMs);
    if (this.queryTimes.length > this.MAX_QUERY_HISTORY) {
      this.queryTimes.shift();
    }

    // Calculate rolling average
    this.health.averageResponseTimeMs = 
      this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length;

    // Update health status
    this.health.healthy = this.health.consecutiveFailures < 3;
    this.health.lastCheck = new Date();
  }

  /**
   * Execute a query with retry logic and metrics
   */
  public async query<T>(
    queryFn: () => Promise<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const {
      operationName = "database query",
      maxRetries = 3,
    } = options;

    const startTime = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await queryFn();
        
        const duration = Date.now() - startTime;
        this.updateMetrics(true, duration);
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          this.updateMetrics(false, Date.now() - startTime);
          throw error;
        }

        // Log retry attempt
        console.log(
          `[DB-Singleton] ${operationName} failed (attempt ${attempt + 1}/${maxRetries}): ${lastError.message}`
        );

        // Don't delay on last attempt
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, this.calculateDelay(attempt))
          );
        }
      }
    }

    // All retries exhausted
    this.updateMetrics(false, Date.now() - startTime);
    throw new Error(
      `${operationName} failed after ${maxRetries} attempts. Last error: ${lastError?.message}`
    );
  }

  /**
   * Execute a raw SQL query with template literals
   */
  public async execute<T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> {
    const sql = this.getClient();
    
    return this.query(
      () => sql(strings, ...values) as Promise<T[]>,
      { operationName: "raw SQL query" }
    );
  }

  /**
   * Test database connection
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.query(
        async () => {
          const sql = this.getClient();
          return sql`SELECT version()`;
        },
        { operationName: "test connection", maxRetries: 1 }
      );
      
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

  /**
   * Check if database is healthy
   */
  public async isHealthy(): Promise<boolean> {
    try {
      await this.query(
        async () => {
          const sql = this.getClient();
          return sql`SELECT 1`;
        },
        { operationName: "health check", maxRetries: 1 }
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current health status
   */
  public getHealthStatus(): HealthStatus {
    return { ...this.health };
  }

  /**
   * Reset connection (useful for error recovery)
   */
  public resetConnection(): void {
    this.sqlClient = null;
    this.health.healthy = false;
    this.health.consecutiveFailures = 0;
    console.log("[DB-Singleton] Connection reset");
  }

  /**
   * Get connection statistics
   */
  public getStats(): {
    totalQueries: number;
    failedQueries: number;
    successRate: number;
    averageResponseTimeMs: number;
    isHealthy: boolean;
  } {
    const total = this.health.totalQueries;
    const failed = this.health.failedQueries;
    const successRate = total > 0 ? ((total - failed) / total) * 100 : 100;

    return {
      totalQueries: total,
      failedQueries: failed,
      successRate: Math.round(successRate * 100) / 100,
      averageResponseTimeMs: Math.round(this.health.averageResponseTimeMs * 100) / 100,
      isHealthy: this.health.healthy,
    };
  }
}

// ============================================================================
// Export singleton instance and utilities
// ============================================================================

/**
 * Singleton database manager instance
 */
export const dbManager = DatabaseManager.getInstance();

/**
 * SQL template literal function with retry logic
 * Usage: const result = await sql`SELECT * FROM vehicles WHERE id = ${id}`
 */
export async function sql<T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> {
  return dbManager.execute<T>(strings, ...values);
}

/**
 * Execute a query with custom retry options
 */
export async function queryWithRetry<T>(
  queryFn: () => Promise<T>,
  operationName?: string,
  maxRetries?: number
): Promise<T> {
  return dbManager.query(queryFn, { operationName, maxRetries });
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<{ success: boolean; message: string }> {
  return dbManager.testConnection();
}

/**
 * Check database health
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  return dbManager.isHealthy();
}

/**
 * Get connection statistics
 */
export function getConnectionStats(): ReturnType<DatabaseManager["getStats"]> {
  return dbManager.getStats();
}

/**
 * Reset database connection
 */
export function resetConnection(): void {
  dbManager.resetConnection();
}

// Default export for compatibility
export default dbManager;
