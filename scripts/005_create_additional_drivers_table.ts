import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';

export default function run(db: DatabaseType) {
  // Create additional_drivers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS additional_drivers (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      date_of_birth DATE NOT NULL,
      gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'non-binary')),
      relationship TEXT NOT NULL CHECK (relationship IN ('spouse', 'child', 'parent', 'sibling', 'other')),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_additional_drivers_application_id 
    ON additional_drivers(application_id)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_additional_drivers_relationship 
    ON additional_drivers(relationship)
  `);

  // Note: Maximum 3 additional drivers per application is enforced at application level
  // This allows for better error messages and easier testing

  console.log('Migration 005: Created additional_drivers table');
}

export function rollback(db: DatabaseType) {
  // Drop indexes
  db.exec(`DROP INDEX IF EXISTS idx_additional_drivers_application_id`);
  db.exec(`DROP INDEX IF EXISTS idx_additional_drivers_relationship`);

  // Drop table
  db.exec(`DROP TABLE IF EXISTS additional_drivers`);

  console.log('Rollback 005: Dropped additional_drivers table');
}
