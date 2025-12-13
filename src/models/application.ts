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
