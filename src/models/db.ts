import Database from 'better-sqlite3';
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
export const db = new Database(dbPath);

// Enable foreign keys (SQLite doesn't enforce by default)
db.pragma('foreign_keys = ON');

// Helper to wrap synchronous database operations in async functions
export function dbAsync<T>(fn: () => T): Promise<T> {
  return Promise.resolve(fn());
}
