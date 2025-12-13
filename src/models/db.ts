import Database from 'better-sqlite3';
import path from 'path';

// Use test database in test environment, otherwise use DB_PATH or default
const getDbPath = () => {
  if (process.env.NODE_ENV === 'test') {
    return process.env.TEST_DB_PATH || path.join(process.cwd(), 'test.db');
  }
  return process.env.DB_PATH || path.join(process.cwd(), 'applications.db');
};

const dbPath = getDbPath();

// Create database connection
export const db = new Database(dbPath);

// Enable foreign keys (SQLite doesn't enforce by default)
db.pragma('foreign_keys = ON');

// Helper to wrap synchronous database operations in async functions
export function dbAsync<T>(fn: () => T): Promise<T> {
  return Promise.resolve(fn());
}
