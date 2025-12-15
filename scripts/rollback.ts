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

// Get the migration name from command line argument
const migrationName = process.argv[2];

if (!migrationName) {
  console.error('❌ Please provide a migration name to rollback');
  console.log('Usage: npm run rollback <migration-name>');
  console.log('Example: npm run rollback 001_create_drivers_table.ts');
  process.exit(1);
}

// Check if migration exists
const scriptsDir = path.join(process.cwd(), 'scripts');
const migrationPath = path.join(scriptsDir, migrationName);

if (!fs.existsSync(migrationPath)) {
  console.error(`❌ Migration file not found: ${migrationName}`);
  process.exit(1);
}

// Check if migration has been executed
const executedMigration = db
  .prepare('SELECT name FROM migrations WHERE name = ?')
  .get(migrationName) as { name: string } | undefined;

if (!executedMigration) {
  console.error(`❌ Migration ${migrationName} has not been executed`);
  process.exit(1);
}

async function rollbackMigration() {
  console.log(`🔄 Rolling back ${migrationName}...`);

  try {
    // Import and execute the rollback function
    const migration = await import(migrationPath);

    if (typeof migration.rollback === 'function') {
      migration.rollback(db);
    } else {
      throw new Error(`Migration ${migrationName} does not export a rollback function`);
    }

    // Remove the migration record
    db.prepare('DELETE FROM migrations WHERE name = ?').run(migrationName);
    console.log(`✅ Rolled back ${migrationName}`);
  } catch (error) {
    console.error(`❌ Error rolling back ${migrationName}:`, error);
    db.close();
    process.exit(1);
  }

  db.close();
}

rollbackMigration();
