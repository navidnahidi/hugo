import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';

export default function run(db: DatabaseType) {
  // Create vehicles table
  // Fields are nullable to allow partial data storage (but must be valid if provided)
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      make TEXT,
      model TEXT,
      year INTEGER CHECK (year IS NULL OR (year >= 1985 AND year <= strftime('%Y', 'now') + 1)),
      vin TEXT CHECK (vin IS NULL OR LENGTH(vin) = 17),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_vehicles_application_id 
    ON vehicles(application_id)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_vehicles_vin 
    ON vehicles(vin)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_vehicles_year 
    ON vehicles(year)
  `);

  // Note: Minimum 1 and maximum 3 vehicles per application is enforced at application level
  // This allows for better error messages and easier testing

  console.log('Migration 002: Created vehicles table');
}

export function rollback(db: DatabaseType) {
  // Drop indexes
  db.exec(`DROP INDEX IF EXISTS idx_vehicles_application_id`);
  db.exec(`DROP INDEX IF EXISTS idx_vehicles_vin`);
  db.exec(`DROP INDEX IF EXISTS idx_vehicles_year`);

  // Drop table
  db.exec(`DROP TABLE IF EXISTS vehicles`);

  console.log('Rollback 002: Dropped vehicles table');
}
