import type { Database as DatabaseType } from 'better-sqlite3';

export default function run(db: DatabaseType) {
  // Create applications table with JSON data column
  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
      data TEXT,
      submitted_at DATETIME,
      quote_price REAL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_applications_submitted_at 
    ON applications(submitted_at)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_applications_status 
    ON applications(status)
  `);

  console.log('Migration 001: Created applications table with JSON data column');
}

export function rollback(db: DatabaseType) {
  // Drop indexes
  db.exec(`DROP INDEX IF EXISTS idx_applications_submitted_at`);
  db.exec(`DROP INDEX IF EXISTS idx_applications_status`);

  // Drop table
  db.exec(`DROP TABLE IF EXISTS applications`);

  console.log('Rollback 001: Dropped applications table');
}
