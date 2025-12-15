import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
// Load .env.test if NODE_ENV is test, otherwise load .env
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
} else {
  dotenv.config();
}

// Use test database in test environment, otherwise use DB_PATH or default
// TEST_DB_PATH can be set to force test database even if NODE_ENV is not 'test'
const getDbPath = () => {
  // If TEST_DB_PATH is explicitly set, use it (for test scenarios)
  if (process.env.TEST_DB_PATH) {
    return process.env.TEST_DB_PATH;
  }
  // If NODE_ENV is test, use test.db
  if (process.env.NODE_ENV === 'test') {
    return path.join(process.cwd(), 'test.db');
  }
  // Otherwise use the regular database
  return process.env.DB_PATH || path.join(process.cwd(), 'applications.db');
};

// Cache for database connections per path
const dbCache = new Map<string, DatabaseType>();

// Cache for database file modification times to detect when database is recreated
const dbFileTimes = new Map<string, number>();

// Get or create database connection (lazy initialization)
// This ensures we use the correct database based on current NODE_ENV
function getDb(): DatabaseType {
  const dbPath = getDbPath();

  // Check if database file exists and get its modification time
  let currentFileTime: number | null = null;
  if (fs.existsSync(dbPath)) {
    try {
      const stats = fs.statSync(dbPath);
      currentFileTime = stats.mtimeMs;
    } catch {
      // File might have been deleted between existsSync and statSync
      currentFileTime = null;
    }
  }

  // Return cached connection if it exists and is still valid
  const cachedDb = dbCache.get(dbPath);
  const cachedFileTime = dbFileTimes.get(dbPath);

  if (cachedDb) {
    // Check if database file was recreated (different modification time)
    if (
      currentFileTime !== null &&
      cachedFileTime !== undefined &&
      currentFileTime !== cachedFileTime
    ) {
      // Database file was recreated, close old connection
      try {
        cachedDb.close();
      } catch {
        // Ignore errors when closing
      }
      dbCache.delete(dbPath);
      dbFileTimes.delete(dbPath);
    } else if (currentFileTime === null) {
      // Database file doesn't exist, connection is invalid
      try {
        cachedDb.close();
      } catch {
        // Ignore errors when closing
      }
      dbCache.delete(dbPath);
      dbFileTimes.delete(dbPath);
    } else {
      // File exists and modification time matches, verify connection is still valid
      try {
        // Try a simple operation to verify the connection is still valid
        cachedDb.prepare('SELECT 1').get();
        return cachedDb;
      } catch {
        // Connection is invalid, remove from cache
        try {
          cachedDb.close();
        } catch {
          // Ignore errors when closing invalid connection
        }
        dbCache.delete(dbPath);
        dbFileTimes.delete(dbPath);
      }
    }
  }

  // Ensure the database file exists and is writable
  // If the file doesn't exist, better-sqlite3 will create it, but we need to ensure the directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // If the database file exists, ensure it's writable
  if (fs.existsSync(dbPath)) {
    try {
      // Check if file is writable, if not, make it writable
      fs.accessSync(dbPath, fs.constants.W_OK);
    } catch {
      // File exists but is not writable - try to make it writable
      fs.chmodSync(dbPath, 0o666);
    }
  }

  // Create database connection with write access
  // Use timeout option to handle initial connection if database is busy
  let db: DatabaseType;
  try {
    db = new Database(dbPath, { timeout: 5000 });
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }

  // Set busy timeout to handle concurrent access (wait up to 5 seconds for lock)
  try {
    db.pragma('busy_timeout = 5000');
  } catch (error) {
    console.warn('Could not set busy_timeout:', error);
  }

  // Enable foreign keys (SQLite doesn't enforce by default)
  try {
    db.pragma('foreign_keys = ON');
  } catch (error) {
    console.warn('Could not enable foreign keys:', error);
  }

  // Cache the connection and file modification time
  dbCache.set(dbPath, db);
  if (currentFileTime !== null) {
    dbFileTimes.set(dbPath, currentFileTime);
  }
  return db;
}

// Helper to handle SQLITE_READONLY_DBMOVED errors by clearing cache and retrying
function handleDatabaseOperation<T>(operation: () => T, retries = 2): T {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return operation();
    } catch (error: unknown) {
      // Check if this is a SQLITE_READONLY_DBMOVED error
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'SQLITE_READONLY_DBMOVED' &&
        attempt < retries
      ) {
        // Database was moved/deleted, clear cache for this path and retry
        const dbPath = getDbPath();
        const cachedDb = dbCache.get(dbPath);
        if (cachedDb) {
          try {
            cachedDb.close();
          } catch {
            // Ignore errors when closing
          }
        }
        dbCache.delete(dbPath);
        dbFileTimes.delete(dbPath);

        // Small delay before retry
        if (attempt < retries) {
          // For synchronous operations, we can't really delay, but we can try again immediately
          // The next call to getDb() will create a fresh connection
          continue;
        }
      }
      // If not retryable or out of retries, throw the error
      throw error;
    }
  }
  // This should never be reached, but TypeScript needs it
  throw new Error('Operation failed after retries');
}

// Export a getter that always returns the correct database based on current environment
// Wraps operations to handle SQLITE_READONLY_DBMOVED errors
export const db = new Proxy({} as DatabaseType, {
  get(_target, prop) {
    // If it's a method call (like prepare), wrap it to handle errors
    if (prop === 'prepare') {
      return function (sql: string) {
        const dbInstance = getDb();
        const prepared = dbInstance.prepare(sql);

        // Wrap the prepared statement's methods to handle SQLITE_READONLY_DBMOVED
        return new Proxy(prepared, {
          get(target, propName) {
            const original = target[propName as keyof typeof target];
            if (typeof original === 'function') {
              return function (...args: unknown[]) {
                return handleDatabaseOperation(() => {
                  return (original as (...args: unknown[]) => unknown).apply(target, args);
                });
              };
            }
            return original;
          },
        });
      };
    }

    // For other properties, just return them normally
    const dbInstance = getDb();
    return (dbInstance as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Helper to wrap synchronous database operations in async functions with retry logic
export function dbAsync<T>(fn: () => T, retries = 3): Promise<T> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const execute = () => {
      try {
        const result = fn();
        resolve(result);
      } catch (error: unknown) {
        attempts++;
        if (error && typeof error === 'object' && 'code' in error) {
          const errorCode = error.code;

          // Handle SQLITE_BUSY - retry after delay
          if (errorCode === 'SQLITE_BUSY' && attempts < retries) {
            setTimeout(execute, 100 * attempts);
            return;
          }

          // Handle SQLITE_READONLY_DBMOVED - database was moved/deleted, clear cache and retry
          if (errorCode === 'SQLITE_READONLY_DBMOVED' && attempts < retries) {
            // Clear the cache for this database path to force a new connection
            const dbPath = getDbPath();
            const cachedDb = dbCache.get(dbPath);
            if (cachedDb) {
              try {
                cachedDb.close();
              } catch {
                // Ignore errors when closing
              }
              dbCache.delete(dbPath);
            }
            // Wait a bit for file system to settle, then retry
            setTimeout(execute, 200 * attempts);
            return;
          }
        }
        // If we get here, either it's not a retryable error or we've exhausted retries
        reject(error);
      }
    };
    execute();
  });
}

// Helper to close all database connections
// Useful for test cleanup to ensure database files can be deleted
export function closeAllConnections(): void {
  for (const [, db] of dbCache.entries()) {
    try {
      // Close the connection
      db.close();
    } catch {
      // Ignore errors when closing (connection might already be closed)
    }
  }
  // Always clear the cache, even if closing failed
  dbCache.clear();
  dbFileTimes.clear();
}
