import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';

export default function run(db: DatabaseType) {
  // Create mailing_addresses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS mailing_addresses (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      street TEXT NOT NULL,
      unit TEXT,
      city TEXT NOT NULL,
      state TEXT NOT NULL CHECK (LENGTH(state) = 2),
      zip_code TEXT NOT NULL CHECK (LENGTH(zip_code) = 5),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_mailing_addresses_application_id 
    ON mailing_addresses(application_id)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_mailing_addresses_state 
    ON mailing_addresses(state)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_mailing_addresses_zip_code 
    ON mailing_addresses(zip_code)
  `);

  console.log('Migration 003: Created mailing_addresses table');
}

export function rollback(db: DatabaseType) {
  // Drop indexes
  db.exec(`DROP INDEX IF EXISTS idx_mailing_addresses_application_id`);
  db.exec(`DROP INDEX IF EXISTS idx_mailing_addresses_state`);
  db.exec(`DROP INDEX IF EXISTS idx_mailing_addresses_zip_code`);

  // Drop table
  db.exec(`DROP TABLE IF EXISTS mailing_addresses`);

  console.log('Rollback 003: Dropped mailing_addresses table');
}
