import { ZodError } from 'zod';
import { applicationSchema } from './schemas/application';
import { db, dbAsync } from '../models/db';
import * as ApplicationModel from '../models/application';
import * as PrimaryDriverModel from '../models/primaryDriver';
import * as MailingAddressModel from '../models/mailingAddress';
import * as GaragingAddressModel from '../models/garagingAddress';
import * as VehicleModel from '../models/vehicle';
import * as AdditionalDriverModel from '../models/additionalDriver';

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

    // Create application
    const applicationId = ApplicationModel.createApplication();

    // Start transaction
    const transaction = db.transaction(() => {
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
        const driverId = PrimaryDriverModel.createPrimaryDriver({
          ...validatedData.primaryDriver,
          driversLicense: validatedData.primaryDriver.driversLicense!,
        });
        ApplicationModel.linkPrimaryDriver(applicationId, driverId);
      }

      // Create mailing address if all required fields are provided
      if (
        validatedData.mailingAddress &&
        validatedData.mailingAddress.street &&
        validatedData.mailingAddress.city &&
        validatedData.mailingAddress.state &&
        validatedData.mailingAddress.zipCode
      ) {
        const addressId = MailingAddressModel.createMailingAddress(
          applicationId,
          validatedData.mailingAddress
        );
        ApplicationModel.linkMailingAddress(applicationId, addressId);
      }

      // Create garaging address if all required fields are provided
      if (
        validatedData.garagingAddress &&
        validatedData.garagingAddress.street &&
        validatedData.garagingAddress.city &&
        validatedData.garagingAddress.state &&
        validatedData.garagingAddress.zipCode
      ) {
        const addressId = GaragingAddressModel.createGaragingAddress(
          applicationId,
          validatedData.garagingAddress
        );
        ApplicationModel.linkGaragingAddress(applicationId, addressId);
      }

      // Create vehicles if provided
      if (validatedData.vehicles) {
        for (const [vehicleId, vehicle] of Object.entries(validatedData.vehicles)) {
          if (vehicle.make && vehicle.model && vehicle.year && vehicle.vin) {
            VehicleModel.createVehicle(vehicleId, applicationId, vehicle);
          }
        }
      }

      // Create additional drivers if all required fields are provided
      if (validatedData.additionalDrivers) {
        for (const [driverId, driver] of Object.entries(validatedData.additionalDrivers)) {
          if (
            driver.firstName &&
            driver.lastName &&
            driver.dateOfBirth &&
            driver.gender &&
            driver.relationship
          ) {
            AdditionalDriverModel.createAdditionalDriver(driverId, applicationId, driver);
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
    const application = ApplicationModel.getApplicationById(id);

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
      const driver = PrimaryDriverModel.getPrimaryDriverById(application.primary_driver_id);

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
      const address = MailingAddressModel.getMailingAddressById(application.mailing_address_id);

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
      const address = GaragingAddressModel.getGaragingAddressById(application.garaging_address_id);

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
    const vehicles = VehicleModel.getVehiclesByApplicationId(application.id);

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
    const additionalDrivers = AdditionalDriverModel.getAdditionalDriversByApplicationId(
      application.id
    );

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

export interface UpdateApplicationResult {
  id: string;
  message: string;
}

export interface ForbiddenError {
  error: 'Forbidden';
  message: string;
}

export type UpdateApplicationError = NotFoundError | ForbiddenError | ValidationError | ServerError;

export async function updateApplication(
  id: string,
  data: JsonObject
): Promise<UpdateApplicationResult | UpdateApplicationError> {
  try {
    // Validate request data
    const validatedData = applicationSchema.parse(data);

    // Get existing application
    const application = ApplicationModel.getApplicationById(id);

    if (!application) {
      return {
        error: 'Not found',
        message: `Application with id ${id} not found`,
      };
    }

    // Check if application is already submitted
    if (application.status === 'submitted') {
      return {
        error: 'Forbidden',
        message: 'Cannot update a submitted application',
      };
    }

    // Start transaction
    const transaction = db.transaction(() => {
      // Update application timestamp
      ApplicationModel.updateApplicationTimestamp(id);

      // Update or create primary driver
      if (validatedData.primaryDriver) {
        const driver = validatedData.primaryDriver;

        // Check if all required fields are present for a complete update
        const hasAllFields =
          driver.firstName &&
          driver.lastName &&
          driver.dateOfBirth &&
          driver.gender &&
          driver.maritalStatus &&
          driver.driversLicense?.number &&
          driver.driversLicense?.state;

        if (hasAllFields) {
          if (application.primary_driver_id) {
            // Update existing primary driver
            PrimaryDriverModel.updatePrimaryDriver(application.primary_driver_id, {
              ...driver,
              driversLicense: driver.driversLicense!,
            });
          } else {
            // Create new primary driver
            const driverId = PrimaryDriverModel.createPrimaryDriver({
              ...driver,
              driversLicense: driver.driversLicense!,
            });
            ApplicationModel.linkPrimaryDriver(id, driverId);
          }
        }
      }

      // Update or create mailing address
      if (validatedData.mailingAddress) {
        const address = validatedData.mailingAddress;
        const hasAllFields = address.street && address.city && address.state && address.zipCode;

        if (hasAllFields) {
          if (application.mailing_address_id) {
            // Update existing address
            MailingAddressModel.updateMailingAddress(application.mailing_address_id, address);
          } else {
            // Create new address
            const addressId = MailingAddressModel.createMailingAddress(id, address);
            ApplicationModel.linkMailingAddress(id, addressId);
          }
        }
      }

      // Update or create garaging address
      if (validatedData.garagingAddress) {
        const address = validatedData.garagingAddress;
        const hasAllFields = address.street && address.city && address.state && address.zipCode;

        if (hasAllFields) {
          if (application.garaging_address_id) {
            // Update existing address
            GaragingAddressModel.updateGaragingAddress(application.garaging_address_id, address);
          } else {
            // Create new address
            const addressId = GaragingAddressModel.createGaragingAddress(id, address);
            ApplicationModel.linkGaragingAddress(id, addressId);
          }
        }
      }

      // Update or create vehicles
      if (validatedData.vehicles) {
        for (const [vehicleId, vehicle] of Object.entries(validatedData.vehicles)) {
          const hasAllFields = vehicle.make && vehicle.model && vehicle.year && vehicle.vin;

          if (hasAllFields) {
            // Check if vehicle exists
            const existingVehicle = VehicleModel.getVehicleById(vehicleId, id);

            if (existingVehicle) {
              // Update existing vehicle
              VehicleModel.updateVehicle(vehicleId, id, vehicle);
            } else {
              // Create new vehicle
              VehicleModel.createVehicle(vehicleId, id, vehicle);
            }
          }
        }
      }

      // Update or create additional drivers
      if (validatedData.additionalDrivers) {
        for (const [driverId, driver] of Object.entries(validatedData.additionalDrivers)) {
          const hasAllFields =
            driver.firstName &&
            driver.lastName &&
            driver.dateOfBirth &&
            driver.gender &&
            driver.relationship;

          if (hasAllFields) {
            // Check if driver exists
            const existingDriver = AdditionalDriverModel.getAdditionalDriverById(driverId, id);

            if (existingDriver) {
              // Update existing driver
              AdditionalDriverModel.updateAdditionalDriver(driverId, id, driver);
            } else {
              // Create new driver
              AdditionalDriverModel.createAdditionalDriver(driverId, id, driver);
            }
          }
        }
      }
    });

    // Execute transaction
    await dbAsync(() => transaction());

    return {
      id,
      message: 'Application updated successfully',
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        error: 'Validation error',
        details: error.issues,
      };
    }

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error updating application:', error);
    return {
      error: 'Internal server error',
      message: errorMessage,
    };
  }
}
