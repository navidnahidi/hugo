import { v4 as uuidv4 } from 'uuid';
import { ZodError } from 'zod';
import { applicationSchema, type Application } from './schemas/application';
import { db, dbAsync } from '../models/db';

export interface CreateApplicationResult {
  id: string;
  message: string;
}

export interface ValidationError {
  error: 'Validation error';
  details: ZodError['issues'];
}

export interface ServerError {
  error: 'Internal server error';
  message: string;
}

export type CreateApplicationError = ValidationError | ServerError;

// Type for unvalidated JSON input
type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

export async function createApplication(
  data: JsonObject
): Promise<CreateApplicationResult | CreateApplicationError> {
  try {
    // Validate request data
    const validatedData = applicationSchema.parse(data);

    // Generate application ID
    const applicationId = uuidv4();

    // Start transaction
    const transaction = db.transaction(() => {
      // Create application record
      db.prepare(
        `
        INSERT INTO applications (id, status, created_at, updated_at)
        VALUES (?, 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
      ).run(applicationId);

      // Create primary driver if provided
      if (validatedData.primaryDriver) {
        const driverId = uuidv4();
        const driver = validatedData.primaryDriver;

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
          driver.firstName,
          driver.lastName,
          driver.dateOfBirth,
          driver.gender,
          driver.maritalStatus,
          driver.driversLicense?.number,
          driver.driversLicense?.state
        );

        // Link to application
        db.prepare(
          `
          UPDATE applications SET primary_driver_id = ? WHERE id = ?
        `
        ).run(driverId, applicationId);
      }

      // Create mailing address if provided
      if (validatedData.mailingAddress) {
        const addressId = uuidv4();
        const address = validatedData.mailingAddress;

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
          address.street,
          address.unit || null,
          address.city,
          address.state,
          address.zipCode
        );

        // Link to application
        db.prepare(
          `
          UPDATE applications SET mailing_address_id = ? WHERE id = ?
        `
        ).run(addressId, applicationId);
      }

      // Create garaging address if provided
      if (validatedData.garagingAddress) {
        const addressId = uuidv4();
        const address = validatedData.garagingAddress;

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
          address.street,
          address.city,
          address.state,
          address.zipCode
        );

        // Link to application
        db.prepare(
          `
          UPDATE applications SET garaging_address_id = ? WHERE id = ?
        `
        ).run(addressId, applicationId);
      }

      // Create vehicles if provided
      if (validatedData.vehicles) {
        for (const [vehicleId, vehicle] of Object.entries(validatedData.vehicles)) {
          db.prepare(
            `
            INSERT INTO vehicles (
              id, application_id, make, model, year, vin,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `
          ).run(vehicleId, applicationId, vehicle.make, vehicle.model, vehicle.year, vehicle.vin);
        }
      }

      // Create additional drivers if provided
      if (validatedData.additionalDrivers) {
        for (const [driverId, driver] of Object.entries(validatedData.additionalDrivers)) {
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
            driver.firstName,
            driver.lastName,
            driver.dateOfBirth,
            driver.gender,
            driver.relationship
          );
        }
      }
    });

    // Execute transaction
    await dbAsync(() => transaction());

    // Return created application
    return {
      id: applicationId,
      message: 'Application created successfully',
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        error: 'Validation error',
        details: error.issues,
      };
    }

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error creating application:', error);
    return {
      error: 'Internal server error',
      message: errorMessage,
    };
  }
}
