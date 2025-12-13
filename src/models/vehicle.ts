import { db } from './db';
import type { Vehicle } from '../controllers/schemas/application';

export interface VehicleRecord {
  id: string;
  application_id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  created_at: string;
  updated_at: string;
}

export function createVehicle(vehicleId: string, applicationId: string, vehicle: Vehicle): void {
  db.prepare(
    `
    INSERT INTO vehicles (
      id, application_id, make, model, year, vin,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `
  ).run(vehicleId, applicationId, vehicle.make!, vehicle.model!, vehicle.year!, vehicle.vin!);
}

export function getVehiclesByApplicationId(applicationId: string): VehicleRecord[] {
  return db
    .prepare('SELECT * FROM vehicles WHERE application_id = ?')
    .all(applicationId) as VehicleRecord[];
}

export function getVehicleById(
  vehicleId: string,
  applicationId: string
): VehicleRecord | undefined {
  return db
    .prepare('SELECT * FROM vehicles WHERE id = ? AND application_id = ?')
    .get(vehicleId, applicationId) as VehicleRecord | undefined;
}

export function updateVehicle(vehicleId: string, applicationId: string, vehicle: Vehicle): void {
  db.prepare(
    `
    UPDATE vehicles SET
      make = ?,
      model = ?,
      year = ?,
      vin = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND application_id = ?
  `
  ).run(vehicle.make!, vehicle.model!, vehicle.year!, vehicle.vin!, vehicleId, applicationId);
}

export function deleteVehicle(vehicleId: string, applicationId: string): void {
  db.prepare('DELETE FROM vehicles WHERE id = ? AND application_id = ?').run(
    vehicleId,
    applicationId
  );
}
