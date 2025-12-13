import { ZodError } from 'zod';
import { applicationSchema } from './schemas/application';
import { db, dbAsync } from '../models/db';
import * as ApplicationModel from '../models/application';
import * as PrimaryDriverModel from '../models/primaryDriver';
import * as MailingAddressModel from '../models/mailingAddress';
import * as GaragingAddressModel from '../models/garagingAddress';
import * as VehicleModel from '../models/vehicle';
import * as AdditionalDriverModel from '../models/additionalDriver';
import type {
  JsonObject,
  CreateApplicationResult,
  CreateApplicationError,
  GetApplicationResult,
  GetApplicationError,
  UpdateApplicationResult,
  UpdateApplicationError,
  ValidationError,
} from './types';

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
      // Create primary driver if provided (partial data is OK - Zod validates what's provided)
      if (validatedData.primaryDriver) {
        const driverId = PrimaryDriverModel.createPrimaryDriver(validatedData.primaryDriver);
        ApplicationModel.linkPrimaryDriver(applicationId, driverId);
      }

      // Create mailing address if provided (partial data is OK)
      if (validatedData.mailingAddress) {
        const addressId = MailingAddressModel.createMailingAddress(
          applicationId,
          validatedData.mailingAddress
        );
        ApplicationModel.linkMailingAddress(applicationId, addressId);
      }

      // Create garaging address if provided (partial data is OK)
      if (validatedData.garagingAddress) {
        const addressId = GaragingAddressModel.createGaragingAddress(
          applicationId,
          validatedData.garagingAddress
        );
        ApplicationModel.linkGaragingAddress(applicationId, addressId);
      }

      // Create vehicles if provided (partial data is OK)
      if (validatedData.vehicles) {
        for (const [vehicleId, vehicle] of Object.entries(validatedData.vehicles)) {
          VehicleModel.createVehicle(vehicleId, applicationId, vehicle);
        }
      }

      // Create additional drivers if provided (partial data is OK)
      if (validatedData.additionalDrivers) {
        for (const [driverId, driver] of Object.entries(validatedData.additionalDrivers)) {
          AdditionalDriverModel.createAdditionalDriver(driverId, applicationId, driver);
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
        const primaryDriver: {
          firstName?: string;
          lastName?: string;
          dateOfBirth?: string;
          gender?: string;
          maritalStatus?: string;
          driversLicense?: { number: string; state: string };
        } = {};
        if (driver.first_name) primaryDriver.firstName = driver.first_name;
        if (driver.last_name) primaryDriver.lastName = driver.last_name;
        if (driver.date_of_birth) primaryDriver.dateOfBirth = driver.date_of_birth;
        if (driver.gender) primaryDriver.gender = driver.gender;
        if (driver.marital_status) primaryDriver.maritalStatus = driver.marital_status;
        if (driver.drivers_license_number && driver.drivers_license_state) {
          primaryDriver.driversLicense = {
            number: driver.drivers_license_number,
            state: driver.drivers_license_state,
          };
        }
        if (Object.keys(primaryDriver).length > 0) {
          result.primaryDriver = primaryDriver;
        }
      }
    }

    // Get mailing address if exists
    if (application.mailing_address_id) {
      const address = MailingAddressModel.getMailingAddressById(application.mailing_address_id);

      if (address) {
        const mailingAddress: {
          street?: string;
          city?: string;
          state?: string;
          zipCode?: string;
          unit?: string;
        } = {};
        if (address.street) mailingAddress.street = address.street;
        if (address.city) mailingAddress.city = address.city;
        if (address.state) mailingAddress.state = address.state;
        if (address.zip_code) mailingAddress.zipCode = address.zip_code;
        if (address.unit) mailingAddress.unit = address.unit;
        if (Object.keys(mailingAddress).length > 0) {
          result.mailingAddress = mailingAddress;
        }
      }
    }

    // Get garaging address if exists
    if (application.garaging_address_id) {
      const address = GaragingAddressModel.getGaragingAddressById(application.garaging_address_id);

      if (address) {
        const garagingAddress: {
          street?: string;
          city?: string;
          state?: string;
          zipCode?: string;
        } = {};
        if (address.street) garagingAddress.street = address.street;
        if (address.city) garagingAddress.city = address.city;
        if (address.state) garagingAddress.state = address.state;
        if (address.zip_code) garagingAddress.zipCode = address.zip_code;
        if (Object.keys(garagingAddress).length > 0) {
          result.garagingAddress = garagingAddress;
        }
      }
    }

    // Get vehicles
    const vehicles = VehicleModel.getVehiclesByApplicationId(application.id);

    if (vehicles.length > 0) {
      result.vehicles = {};
      for (const vehicle of vehicles) {
        const vehicleData: {
          make?: string;
          model?: string;
          year?: number;
          vin?: string;
        } = {};
        if (vehicle.make) vehicleData.make = vehicle.make;
        if (vehicle.model) vehicleData.model = vehicle.model;
        if (vehicle.year !== null) vehicleData.year = vehicle.year;
        if (vehicle.vin) vehicleData.vin = vehicle.vin;
        if (Object.keys(vehicleData).length > 0) {
          result.vehicles[vehicle.id] = vehicleData;
        }
      }
    }

    // Get additional drivers
    const additionalDrivers = AdditionalDriverModel.getAdditionalDriversByApplicationId(
      application.id
    );

    if (additionalDrivers.length > 0) {
      result.additionalDrivers = {};
      for (const driver of additionalDrivers) {
        const driverData: {
          firstName?: string;
          lastName?: string;
          dateOfBirth?: string;
          gender?: string;
          relationship?: string;
        } = {};
        if (driver.first_name) driverData.firstName = driver.first_name;
        if (driver.last_name) driverData.lastName = driver.last_name;
        if (driver.date_of_birth) driverData.dateOfBirth = driver.date_of_birth;
        if (driver.gender) driverData.gender = driver.gender;
        if (driver.relationship) driverData.relationship = driver.relationship;
        if (Object.keys(driverData).length > 0) {
          result.additionalDrivers[driver.id] = driverData;
        }
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

      // Update or create primary driver (partial data is OK - Zod validates what's provided)
      if (validatedData.primaryDriver) {
        if (application.primary_driver_id) {
          // Update existing primary driver
          PrimaryDriverModel.updatePrimaryDriver(
            application.primary_driver_id,
            validatedData.primaryDriver
          );
        } else {
          // Create new primary driver
          const driverId = PrimaryDriverModel.createPrimaryDriver(validatedData.primaryDriver);
          ApplicationModel.linkPrimaryDriver(id, driverId);
        }
      }

      // Update or create mailing address (partial data is OK)
      if (validatedData.mailingAddress) {
        if (application.mailing_address_id) {
          // Update existing address
          MailingAddressModel.updateMailingAddress(
            application.mailing_address_id,
            validatedData.mailingAddress
          );
        } else {
          // Create new address
          const addressId = MailingAddressModel.createMailingAddress(
            id,
            validatedData.mailingAddress
          );
          ApplicationModel.linkMailingAddress(id, addressId);
        }
      }

      // Update or create garaging address (partial data is OK)
      if (validatedData.garagingAddress) {
        if (application.garaging_address_id) {
          // Update existing address
          GaragingAddressModel.updateGaragingAddress(
            application.garaging_address_id,
            validatedData.garagingAddress
          );
        } else {
          // Create new address
          const addressId = GaragingAddressModel.createGaragingAddress(
            id,
            validatedData.garagingAddress
          );
          ApplicationModel.linkGaragingAddress(id, addressId);
        }
      }

      // Update or create vehicles (partial data is OK)
      if (validatedData.vehicles) {
        for (const [vehicleId, vehicle] of Object.entries(validatedData.vehicles)) {
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

      // Update or create additional drivers (partial data is OK)
      if (validatedData.additionalDrivers) {
        for (const [driverId, driver] of Object.entries(validatedData.additionalDrivers)) {
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
