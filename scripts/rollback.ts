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
