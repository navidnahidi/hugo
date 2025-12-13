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

      // Create primary driver if all required fields are provided
      if (
        validatedData.primaryDriver &&
        validatedData.primaryDriver.firstName &&
        validatedData.primaryDriver.lastName &&
        validatedData.primaryDriver.dateOfBirth &&
        validatedData.primaryDriver.gender &&
        validatedData.primaryDriver.maritalStatus &&
        validatedData.primaryDriver.driversLicense?.number &&
        validatedData.primaryDriver.driversLicense?.state
      ) {
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
          driver.driversLicense!.number,
          driver.driversLicense!.state
        );

        // Link to application
        db.prepare(
          `
          UPDATE applications SET primary_driver_id = ? WHERE id = ?
        `
        ).run(driverId, applicationId);
      }

      // Create mailing address if all required fields are provided
      if (
        validatedData.mailingAddress &&
        validatedData.mailingAddress.street &&
        validatedData.mailingAddress.city &&
        validatedData.mailingAddress.state &&
        validatedData.mailingAddress.zipCode
      ) {
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

      // Create garaging address if all required fields are provided
      if (
        validatedData.garagingAddress &&
        validatedData.garagingAddress.street &&
        validatedData.garagingAddress.city &&
        validatedData.garagingAddress.state &&
        validatedData.garagingAddress.zipCode
      ) {
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

      // Create additional drivers if all required fields are provided
      if (validatedData.additionalDrivers) {
        for (const [driverId, driver] of Object.entries(validatedData.additionalDrivers)) {
          // Only insert if all required fields are present
          if (
            driver.firstName &&
            driver.lastName &&
            driver.dateOfBirth &&
            driver.gender &&
            driver.relationship
          ) {
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

export interface GetApplicationResult {
  id: string;
  primaryDriver?: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    maritalStatus: string;
    driversLicense: {
      number: string;
      state: string;
    };
  };
  mailingAddress?: {
    street: string;
    unit?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  garagingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  vehicles?: {
    [id: string]: {
      make: string;
      model: string;
      year: number;
      vin: string;
    };
  };
  additionalDrivers?: {
    [id: string]: {
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      gender: string;
      relationship: string;
    };
  };
  status: string;
  submittedAt?: string;
  quotePrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotFoundError {
  error: 'Not found';
  message: string;
}

export type GetApplicationError = NotFoundError | ServerError;

export async function getApplication(
  id: string
): Promise<GetApplicationResult | GetApplicationError> {
  try {
    // Get application
    const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as
      | {
          id: string;
          primary_driver_id: string | null;
          mailing_address_id: string | null;
          garaging_address_id: string | null;
          status: string;
          submitted_at: string | null;
          quote_price: number | null;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    if (!application) {
      return {
        error: 'Not found',
        message: `Application with id ${id} not found`,
      };
    }

    const result: GetApplicationResult = {
      id: application.id,
      status: application.status,
      createdAt: application.created_at,
      updatedAt: application.updated_at,
    };

    if (application.submitted_at) {
      result.submittedAt = application.submitted_at;
    }

    if (application.quote_price !== null) {
      result.quotePrice = application.quote_price;
    }

    // Get primary driver if exists
    if (application.primary_driver_id) {
      const driver = db
        .prepare('SELECT * FROM primary_drivers WHERE id = ?')
        .get(application.primary_driver_id) as
        | {
            first_name: string;
            last_name: string;
            date_of_birth: string;
            gender: string;
            marital_status: string;
            drivers_license_number: string;
            drivers_license_state: string;
          }
        | undefined;

      if (driver) {
        result.primaryDriver = {
          firstName: driver.first_name,
          lastName: driver.last_name,
          dateOfBirth: driver.date_of_birth,
          gender: driver.gender,
          maritalStatus: driver.marital_status,
          driversLicense: {
            number: driver.drivers_license_number,
            state: driver.drivers_license_state,
          },
        };
      }
    }

    // Get mailing address if exists
    if (application.mailing_address_id) {
      const address = db
        .prepare('SELECT * FROM mailing_addresses WHERE id = ?')
        .get(application.mailing_address_id) as
        | {
            street: string;
            unit: string | null;
            city: string;
            state: string;
            zip_code: string;
          }
        | undefined;

      if (address) {
        result.mailingAddress = {
          street: address.street,
          city: address.city,
          state: address.state,
          zipCode: address.zip_code,
        };
        if (address.unit) {
          result.mailingAddress.unit = address.unit;
        }
      }
    }

    // Get garaging address if exists
    if (application.garaging_address_id) {
      const address = db
        .prepare('SELECT * FROM garaging_addresses WHERE id = ?')
        .get(application.garaging_address_id) as
        | {
            street: string;
            city: string;
            state: string;
            zip_code: string;
          }
        | undefined;

      if (address) {
        result.garagingAddress = {
          street: address.street,
          city: address.city,
          state: address.state,
          zipCode: address.zip_code,
        };
      }
    }

    // Get vehicles
    const vehicles = db
      .prepare('SELECT * FROM vehicles WHERE application_id = ?')
      .all(application.id) as Array<{
      id: string;
      make: string;
      model: string;
      year: number;
      vin: string;
    }>;

    if (vehicles.length > 0) {
      result.vehicles = {};
      for (const vehicle of vehicles) {
        result.vehicles[vehicle.id] = {
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          vin: vehicle.vin,
        };
      }
    }

    // Get additional drivers
    const additionalDrivers = db
      .prepare('SELECT * FROM additional_drivers WHERE application_id = ?')
      .all(application.id) as Array<{
      id: string;
      first_name: string;
      last_name: string;
      date_of_birth: string;
      gender: string;
      relationship: string;
    }>;

    if (additionalDrivers.length > 0) {
      result.additionalDrivers = {};
      for (const driver of additionalDrivers) {
        result.additionalDrivers[driver.id] = {
          firstName: driver.first_name,
          lastName: driver.last_name,
          dateOfBirth: driver.date_of_birth,
          gender: driver.gender,
          relationship: driver.relationship,
        };
      }
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error getting application:', error);
    return {
      error: 'Internal server error',
      message: errorMessage,
    };
  }
}
