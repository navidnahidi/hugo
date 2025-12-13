import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';

export default function run(db: DatabaseType) {
  // Create primary_drivers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS primary_drivers (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      date_of_birth DATE NOT NULL,
      gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'non-binary')),
      marital_status TEXT NOT NULL CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
      drivers_license_number TEXT NOT NULL CHECK (LENGTH(drivers_license_number) = 9),
      drivers_license_state TEXT NOT NULL CHECK (LENGTH(drivers_license_state) = 2),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_primary_drivers_license_number 
    ON primary_drivers(drivers_license_number)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_primary_drivers_license_state 
    ON primary_drivers(drivers_license_state)
  `);

  console.log('Migration 001: Created primary_drivers table');
}

export function rollback(db: DatabaseType) {
  // Drop indexes
  db.exec(`DROP INDEX IF EXISTS idx_primary_drivers_license_number`);
  db.exec(`DROP INDEX IF EXISTS idx_primary_drivers_license_state`);
  
  // Drop table
  db.exec(`DROP TABLE IF EXISTS primary_drivers`);

  console.log('Rollback 001: Dropped primary_drivers table');
}
