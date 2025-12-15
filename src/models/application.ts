import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import type { ApplicationRecord } from './types';
import type { Application } from '../controllers/schemas/application';

export function createApplication(data?: Application): string {
  const applicationId = uuidv4();
  const dataJson = data ? JSON.stringify(data) : null;

  try {
    db.prepare(
      `
      INSERT INTO applications (id, status, data, created_at, updated_at)
      VALUES (?, 'draft', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `
    ).run(applicationId, dataJson);
    return applicationId;
  } catch (error: unknown) {
    // If database is busy, the busy_timeout should handle it, but log for debugging
    if (error && typeof error === 'object' && 'code' in error && error.code === 'SQLITE_BUSY') {
      console.error('Database is locked. Make sure no other processes are accessing it.');
      console.error(
        'Try: 1) Stop all server instances, 2) Close database viewers, 3) Restart server'
      );
    }
    throw error;
  }
}

export function getApplicationById(id: string): ApplicationRecord | undefined {
  return db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as
    | ApplicationRecord
    | undefined;
}

export function updateApplicationTimestamp(id: string): void {
  db.prepare('UPDATE applications SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
}

export function updateApplicationData(id: string, data: Application): void {
  const dataJson = JSON.stringify(data);
  db.prepare(
    `
    UPDATE applications 
    SET data = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `
  ).run(dataJson, id);
}

/**
 * Update application data using SQLite's json_patch for merging JSON
 * This is more efficient than fetching, merging in JS, and updating
 * @param id Application ID
 * @param patchData Partial JSON data to merge (RFC 7396 JSON Merge Patch)
 * @returns true if update was successful
 */
export function patchApplicationData(id: string, patchData: Application): boolean {
  const patchJson = JSON.stringify(patchData);
  const result = db
    .prepare(
      `
    UPDATE applications 
    SET data = json_patch(COALESCE(data, '{}'), ?), updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `
    )
    .run(patchJson, id);
  return result.changes > 0;
}

export function updateApplicationStatus(id: string, status: 'draft' | 'submitted'): void {
  db.prepare(
    `
    UPDATE applications 
    SET status = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `
  ).run(status, id);
}

export function getApplicationData(id: string): Application | null {
  const record = getApplicationById(id);
  if (!record || !record.data) {
    return null;
  }
  try {
    return JSON.parse(record.data) as Application;
  } catch {
    return null;
  }
}

export function submitApplication(id: string, quotePrice: number): void {
  db.prepare(
    `
    UPDATE applications 
    SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP, quote_price = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `
  ).run(quotePrice, id);
}

/**
 * Delete a path from the JSON data using SQLite's json_remove function
 * @param id Application ID
 * @param path Dot-separated path (e.g., "vehicles.ABC123")
 * @returns true if the path existed and was deleted, false if path didn't exist
 */
export function deleteApplicationDataPath(id: string, path: string): boolean {
  // Convert dot-separated path to SQLite JSON path format
  // e.g., "vehicles.ABC123" -> "$.vehicles.ABC123"
  const jsonPath = `$.${path.split('.').join('.')}`;

  // Check if the path exists before deletion
  const exists = db
    .prepare(
      `
    SELECT json_extract(data, ?) as value
    FROM applications
    WHERE id = ? AND data IS NOT NULL
  `
    )
    .get(jsonPath, id) as { value: unknown } | undefined;

  if (!exists || exists.value === null) {
    return false;
  }

  // Use json_remove to delete the path directly in SQLite
  const result = db
    .prepare(
      `
    UPDATE applications 
    SET data = json_remove(data, ?), updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `
    )
    .run(jsonPath, id);

  return result.changes > 0;
}
