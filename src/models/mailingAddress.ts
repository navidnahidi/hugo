import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import type { AddressWithUnit } from '../controllers/schemas/application';
import type { MailingAddressRecord } from './types';

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
    address.street || null,
    address.unit || null,
    address.city || null,
    address.state || null,
    address.zipCode || null
  );
  return addressId;
}

export function getMailingAddressById(id: string): MailingAddressRecord | undefined {
  return db.prepare('SELECT * FROM mailing_addresses WHERE id = ?').get(id) as
    | MailingAddressRecord
    | undefined;
}

export function updateMailingAddress(id: string, address: AddressWithUnit): void {
  // Get existing address to merge with
  const existing = getMailingAddressById(id);

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
  ).run(
    address.street ?? existing?.street ?? null,
    address.unit ?? existing?.unit ?? null,
    address.city ?? existing?.city ?? null,
    address.state ?? existing?.state ?? null,
    address.zipCode ?? existing?.zip_code ?? null,
    id
  );
}
