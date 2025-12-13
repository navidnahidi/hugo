import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import type { PrimaryDriver } from '../controllers/schemas/application';
import type { PrimaryDriverRecord } from './types';

export function createPrimaryDriver(driver: PrimaryDriver): string {
  const driverId = uuidv4();
  db.prepare(
    `
    INSERT INTO primary_drivers (
      id, first_name, last_name, date_of_birth, gender,
      marital_status, drivers_license_number, drivers_license_state,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `
  ).run(
    driverId,
    driver.firstName || null,
    driver.lastName || null,
    driver.dateOfBirth || null,
    driver.gender || null,
    driver.maritalStatus || null,
    driver.driversLicense?.number || null,
    driver.driversLicense?.state || null
  );
  return driverId;
}

export function getPrimaryDriverById(id: string): PrimaryDriverRecord | undefined {
  return db.prepare('SELECT * FROM primary_drivers WHERE id = ?').get(id) as
    | PrimaryDriverRecord
    | undefined;
}

export function updatePrimaryDriver(id: string, driver: PrimaryDriver): void {
  // Get existing driver to merge with
  const existing = getPrimaryDriverById(id);

  db.prepare(
    `
    UPDATE primary_drivers SET
      first_name = ?,
      last_name = ?,
      date_of_birth = ?,
      gender = ?,
      marital_status = ?,
      drivers_license_number = ?,
      drivers_license_state = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `
  ).run(
    driver.firstName ?? existing?.first_name ?? null,
    driver.lastName ?? existing?.last_name ?? null,
    driver.dateOfBirth ?? existing?.date_of_birth ?? null,
    driver.gender ?? existing?.gender ?? null,
    driver.maritalStatus ?? existing?.marital_status ?? null,
    driver.driversLicense?.number ?? existing?.drivers_license_number ?? null,
    driver.driversLicense?.state ?? existing?.drivers_license_state ?? null,
    id
  );
}
