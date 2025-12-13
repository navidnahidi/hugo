import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';

export default function run(db: DatabaseType) {
  // Create applications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      primary_driver_id TEXT,
      mailing_address_id TEXT,
      garaging_address_id TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
      submitted_at DATETIME,
      quote_price REAL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_applications_primary_driver_id 
    ON applications(primary_driver_id)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_applications_mailing_address_id 
    ON applications(mailing_address_id)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_applications_garaging_address_id 
    ON applications(garaging_address_id)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_applications_submitted_at 
    ON applications(submitted_at)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_applications_status 
    ON applications(status)
  `);

  // Index to help find applications by primary driver (for duplicate detection if needed)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_applications_primary_driver_status 
    ON applications(primary_driver_id, status)
  `);

  console.log('Migration 006: Created applications table');
}

export function rollback(db: DatabaseType) {
  // Drop indexes
  db.exec(`DROP INDEX IF EXISTS idx_applications_primary_driver_id`);
  db.exec(`DROP INDEX IF EXISTS idx_applications_mailing_address_id`);
  db.exec(`DROP INDEX IF EXISTS idx_applications_garaging_address_id`);
  db.exec(`DROP INDEX IF EXISTS idx_applications_submitted_at`);
  db.exec(`DROP INDEX IF EXISTS idx_applications_status`);
  db.exec(`DROP INDEX IF EXISTS idx_applications_primary_driver_status`);

  // Drop table
  db.exec(`DROP TABLE IF EXISTS applications`);

  console.log('Rollback 006: Dropped applications table');
}
