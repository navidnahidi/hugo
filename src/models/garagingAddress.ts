import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import type { Address } from '../controllers/schemas/application';

export interface GaragingAddressRecord {
  id: string;
  application_id: string;
  street: string;
  city: string;
  state: string;
  zip_code: string;
  created_at: string;
  updated_at: string;
}

export function createGaragingAddress(applicationId: string, address: Address): string {
  const addressId = uuidv4();
  db.prepare(
    `
    INSERT INTO garaging_addresses (
      id, application_id, street, city, state, zip_code,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `
  ).run(addressId, applicationId, address.street!, address.city!, address.state!, address.zipCode!);
  return addressId;
}

export function getGaragingAddressById(id: string): GaragingAddressRecord | undefined {
  return db.prepare('SELECT * FROM garaging_addresses WHERE id = ?').get(id) as
    | GaragingAddressRecord
    | undefined;
}

export function updateGaragingAddress(id: string, address: Address): void {
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
  ).run(address.street!, address.city!, address.state!, address.zipCode!, id);
}
