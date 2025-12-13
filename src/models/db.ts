import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'applications.db');

// Create database connection
export const db = new Database(dbPath);

// Enable foreign keys (SQLite doesn't enforce by default)
db.pragma('foreign_keys = ON');

// Helper to wrap synchronous database operations in async functions
export function dbAsync<T>(fn: () => T): Promise<T> {
  return Promise.resolve(fn());
}
