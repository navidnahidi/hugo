import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Use test database in test environment, otherwise use DB_PATH or default
const getDbPath = () => {
  if (process.env.NODE_ENV === 'test') {
    return process.env.TEST_DB_PATH || path.join(process.cwd(), 'test.db');
  }
  return process.env.DB_PATH || path.join(process.cwd(), 'applications.db');
};

const dbPath = getDbPath();

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
  } catch (error) {
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

export { db };

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
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'SQLITE_BUSY' &&
          attempts < retries
        ) {
          // Retry after a short delay if database is busy
          setTimeout(execute, 100 * attempts);
        } else {
          reject(error);
        }
      }
    };
    execute();
  });
}
