import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import type { Address } from '../controllers/schemas/application';
import type { GaragingAddressRecord } from './types';

export function createGaragingAddress(applicationId: string, address: Address): string {
  const addressId = uuidv4();
  db.prepare(
    `
    INSERT INTO garaging_addresses (
      id, application_id, street, city, state, zip_code,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `
  ).run(
    addressId,
    applicationId,
    address.street || null,
    address.city || null,
    address.state || null,
    address.zipCode || null
  );
  return addressId;
}

export function getGaragingAddressById(id: string): GaragingAddressRecord | undefined {
  return db.prepare('SELECT * FROM garaging_addresses WHERE id = ?').get(id) as
    | GaragingAddressRecord
    | undefined;
}

export function updateGaragingAddress(id: string, address: Address): void {
  // Get existing address to merge with
  const existing = getGaragingAddressById(id);

  db.prepare(
    `
    UPDATE garaging_addresses SET
      street = ?,
      city = ?,
      state = ?,
      zip_code = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `
  ).run(
    address.street ?? existing?.street ?? null,
    address.city ?? existing?.city ?? null,
    address.state ?? existing?.state ?? null,
    address.zipCode ?? existing?.zip_code ?? null,
    id
  );
}
