import { db } from './db';
import type { AdditionalDriver } from '../controllers/schemas/application';
import type { AdditionalDriverRecord } from './types';

export function createAdditionalDriver(
  driverId: string,
  applicationId: string,
  driver: AdditionalDriver
): void {
  db.prepare(
    `
    INSERT INTO additional_drivers (
      id, application_id, first_name, last_name, date_of_birth,
      gender, relationship, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `
  ).run(
    driverId,
    applicationId,
    driver.firstName || null,
    driver.lastName || null,
    driver.dateOfBirth || null,
    driver.gender || null,
    driver.relationship || null
  );
}

export function getAdditionalDriversByApplicationId(
  applicationId: string
): AdditionalDriverRecord[] {
  return db
    .prepare('SELECT * FROM additional_drivers WHERE application_id = ?')
    .all(applicationId) as AdditionalDriverRecord[];
}

export function getAdditionalDriverById(
  driverId: string,
  applicationId: string
): AdditionalDriverRecord | undefined {
  return db
    .prepare('SELECT * FROM additional_drivers WHERE id = ? AND application_id = ?')
    .get(driverId, applicationId) as AdditionalDriverRecord | undefined;
}

export function updateAdditionalDriver(
  driverId: string,
  applicationId: string,
  driver: AdditionalDriver
): void {
  // Get existing driver to merge with
  const existing = getAdditionalDriverById(driverId, applicationId);

  db.prepare(
    `
    UPDATE additional_drivers SET
      first_name = ?,
      last_name = ?,
      date_of_birth = ?,
      gender = ?,
      relationship = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND application_id = ?
  `
  ).run(
    driver.firstName ?? existing?.first_name ?? null,
    driver.lastName ?? existing?.last_name ?? null,
    driver.dateOfBirth ?? existing?.date_of_birth ?? null,
    driver.gender ?? existing?.gender ?? null,
    driver.relationship ?? existing?.relationship ?? null,
    driverId,
    applicationId
  );
}

export function deleteAdditionalDriver(driverId: string, applicationId: string): void {
  db.prepare('DELETE FROM additional_drivers WHERE id = ? AND application_id = ?').run(
    driverId,
    applicationId
  );
}
