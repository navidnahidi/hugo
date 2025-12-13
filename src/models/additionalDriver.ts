import { db } from './db';
import type { AdditionalDriver } from '../controllers/schemas/application';

export interface AdditionalDriverRecord {
  id: string;
  application_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  relationship: string;
  created_at: string;
  updated_at: string;
}

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
    driver.firstName!,
    driver.lastName!,
    driver.dateOfBirth!,
    driver.gender!,
    driver.relationship!
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
    driver.firstName!,
    driver.lastName!,
    driver.dateOfBirth!,
    driver.gender!,
    driver.relationship!,
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
