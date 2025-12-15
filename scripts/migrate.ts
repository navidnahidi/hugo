import Database from 'better-sqlite3';
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

// Determine database path based on environment
const dbPath =
  process.env.NODE_ENV === 'test'
    ? path.resolve(process.cwd(), process.env.TEST_DB_PATH || './test.db')
    : path.resolve(process.cwd(), process.env.DB_PATH || './applications.db');

// Ensure the database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Create migrations table to track which migrations have been run
// Use IF NOT EXISTS to avoid errors if table already exists
db.exec(`
  CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// Get all migration files from the scripts directory
const scriptsDir = path.join(process.cwd(), 'scripts');
const migrationFiles = fs
  .readdirSync(scriptsDir)
  .filter((file) => file.match(/^\d+_.+\.ts$/) && file !== 'migrate.ts')
  .sort();

// Get already executed migrations
interface MigrationRow {
  name: string;
}

const executedMigrations = (db.prepare('SELECT name FROM migrations').all() as MigrationRow[]).map(
  (row) => row.name
);

console.log(`Found ${migrationFiles.length} migration file(s)`);
console.log(`Already executed: ${executedMigrations.length}`);

// Run pending migrations
async function runMigrations() {
  for (const migrationFile of migrationFiles) {
    if (executedMigrations.includes(migrationFile)) {
      console.log(`⏭️  Skipping ${migrationFile} (already executed)`);
      continue;
    }

    console.log(`🔄 Running ${migrationFile}...`);

    try {
      // Import and execute the migration
      const migrationPath = path.resolve(scriptsDir, migrationFile);
      const migration = await import(migrationPath);

      // Call the default exported function with the db instance
      if (typeof migration.default === 'function') {
        migration.default(db);
      } else {
        throw new Error(`Migration ${migrationFile} must export a default function`);
      }

      // Record the migration as executed
      // Use INSERT OR IGNORE to handle case where migration was already recorded
      try {
        db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationFile);
        console.log(`✅ Completed ${migrationFile}`);
      } catch (error: unknown) {
        // If migration already exists (UNIQUE constraint), that's okay - skip it
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'SQLITE_CONSTRAINT_UNIQUE'
        ) {
          console.log(`⏭️  Skipping ${migrationFile} (already recorded in migrations table)`);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error(`❌ Error running ${migrationFile}:`, error);
      db.close();
      process.exit(1);
    }
  }

  console.log('✨ All migrations completed!');
  db.close();
}

runMigrations();
