import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';

export default function run(db: DatabaseType) {
  // Create garaging_addresses table
  // Fields are nullable to allow partial data storage (but must be valid if provided)
  db.exec(`
    CREATE TABLE IF NOT EXISTS garaging_addresses (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      street TEXT,
      city TEXT,
      state TEXT CHECK (state IS NULL OR LENGTH(state) = 2),
      zip_code TEXT CHECK (zip_code IS NULL OR LENGTH(zip_code) = 5),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_garaging_addresses_application_id 
    ON garaging_addresses(application_id)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_garaging_addresses_state 
    ON garaging_addresses(state)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_garaging_addresses_zip_code 
    ON garaging_addresses(zip_code)
  `);

  console.log('Migration 004: Created garaging_addresses table');
}

export function rollback(db: DatabaseType) {
  // Drop indexes
  db.exec(`DROP INDEX IF EXISTS idx_garaging_addresses_application_id`);
  db.exec(`DROP INDEX IF EXISTS idx_garaging_addresses_state`);
  db.exec(`DROP INDEX IF EXISTS idx_garaging_addresses_zip_code`);

  // Drop table
  db.exec(`DROP TABLE IF EXISTS garaging_addresses`);

  console.log('Rollback 004: Dropped garaging_addresses table');
}
