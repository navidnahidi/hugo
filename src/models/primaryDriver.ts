import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import type { PrimaryDriver } from '../controllers/schemas/application';

export interface PrimaryDriverRecord {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  marital_status: string;
  drivers_license_number: string;
  drivers_license_state: string;
  created_at: string;
  updated_at: string;
}

export function createPrimaryDriver(
  driver: PrimaryDriver & { driversLicense: NonNullable<PrimaryDriver['driversLicense']> }
): string {
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
    driver.firstName!,
    driver.lastName!,
    driver.dateOfBirth!,
    driver.gender!,
    driver.maritalStatus!,
    driver.driversLicense.number,
    driver.driversLicense.state
  );
  return driverId;
}

export function getPrimaryDriverById(id: string): PrimaryDriverRecord | undefined {
  return db.prepare('SELECT * FROM primary_drivers WHERE id = ?').get(id) as
    | PrimaryDriverRecord
    | undefined;
}

export function updatePrimaryDriver(
  id: string,
  driver: PrimaryDriver & { driversLicense: NonNullable<PrimaryDriver['driversLicense']> }
): void {
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
    driver.firstName!,
    driver.lastName!,
    driver.dateOfBirth!,
    driver.gender!,
    driver.maritalStatus!,
    driver.driversLicense.number,
    driver.driversLicense.state,
    id
  );
}
