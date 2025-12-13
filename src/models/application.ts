import { v4 as uuidv4 } from 'uuid';
import { db, dbAsync } from './db';

export interface ApplicationRecord {
  id: string;
  primary_driver_id: string | null;
  mailing_address_id: string | null;
  garaging_address_id: string | null;
  status: string;
  submitted_at: string | null;
  quote_price: number | null;
  created_at: string;
  updated_at: string;
}

export function createApplication(): string {
  const applicationId = uuidv4();
  db.prepare(
    `
    INSERT INTO applications (id, status, created_at, updated_at)
    VALUES (?, 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `
  ).run(applicationId);
  return applicationId;
}

export function getApplicationById(id: string): ApplicationRecord | undefined {
  return db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as
    | ApplicationRecord
    | undefined;
}

export function updateApplicationTimestamp(id: string): void {
  db.prepare('UPDATE applications SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
}

export function linkPrimaryDriver(applicationId: string, driverId: string): void {
  db.prepare('UPDATE applications SET primary_driver_id = ? WHERE id = ?').run(
    driverId,
    applicationId
  );
}

export function linkMailingAddress(applicationId: string, addressId: string): void {
  db.prepare('UPDATE applications SET mailing_address_id = ? WHERE id = ?').run(
    addressId,
    applicationId
  );
}

export function linkGaragingAddress(applicationId: string, addressId: string): void {
  db.prepare('UPDATE applications SET garaging_address_id = ? WHERE id = ?').run(
    addressId,
    applicationId
  );
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
