import dotenv from 'dotenv';
import { beforeAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import Database from 'better-sqlite3';
import { closeAllConnections } from '../src/models/db';

const execAsync = promisify(exec);

// Load test environment variables from .env.test
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

// Clean up and setup test database before all tests
beforeAll(async () => {
  // Determine test database path
  // Uses TEST_DB_PATH from .env.test (defaults to ./test.db)
  const testDbPath = process.env.TEST_DB_PATH
    ? path.resolve(process.cwd(), process.env.TEST_DB_PATH)
    : path.join(process.cwd(), 'test.db');

  // Close all existing database connections first
  closeAllConnections();

  // Small delay to ensure connections are fully closed
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Run migrations on test database to ensure schema exists
  // Uses environment variables from .env.test (already loaded via dotenv.config above)
  try {
    await execAsync('npm run migrate', {
      env: process.env,
    });
  } catch (error) {
    console.error('Failed to run migrations:', error);
    throw error;
  }

  // Truncate all tables to ensure clean state
  // This is better than deleting the database file as it avoids connection issues
  const db = new Database(testDbPath);
  try {
    // Get all table names (excluding sqlite system tables)
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as Array<{ name: string }>;

    // Truncate each table by deleting all rows
    for (const table of tables) {
      db.prepare(`DELETE FROM ${table.name}`).run();
    }

    // Reset the migrations table to allow migrations to run again if needed
    // This ensures migrations can be re-run if the schema changes
    db.prepare('DELETE FROM migrations').run();

    console.log(`Truncated ${tables.length} table(s) in test database`);
  } catch (error) {
    console.error('Failed to truncate tables:', error);
    throw error;
  } finally {
    db.close();
  }
});
