import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import type { AddressWithUnit } from '../controllers/schemas/application';

export interface MailingAddressRecord {
  id: string;
  application_id: string;
  street: string;
  unit: string | null;
  city: string;
  state: string;
  zip_code: string;
  created_at: string;
  updated_at: string;
}

export function createMailingAddress(applicationId: string, address: AddressWithUnit): string {
  const addressId = uuidv4();
  db.prepare(
    `
    INSERT INTO mailing_addresses (
      id, application_id, street, unit, city, state, zip_code,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `
  ).run(
    addressId,
    applicationId,
    address.street!,
    address.unit || null,
    address.city!,
    address.state!,
    address.zipCode!
  );
  return addressId;
}

export function getMailingAddressById(id: string): MailingAddressRecord | undefined {
  return db.prepare('SELECT * FROM mailing_addresses WHERE id = ?').get(id) as
    | MailingAddressRecord
    | undefined;
}

export function updateMailingAddress(id: string, address: AddressWithUnit): void {
  db.prepare(
    `
    UPDATE mailing_addresses SET
      street = ?,
      unit = ?,
      city = ?,
      state = ?,
      zip_code = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `
  ).run(address.street!, address.unit || null, address.city!, address.state!, address.zipCode!, id);
}
