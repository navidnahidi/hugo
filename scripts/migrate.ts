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

// Ensure the database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Create migrations table to track which migrations have been run
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
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationFile);
      console.log(`✅ Completed ${migrationFile}`);
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
