import { ZodError } from 'zod';
import {
  applicationSchema,
  applicationSubmissionSchema,
  type Application,
} from './schemas/application';
import * as ApplicationModel from '../models/application';
import type {
  JsonObject,
  CreateApplicationResult,
  CreateApplicationError,
  GetApplicationResult,
  GetApplicationError,
  UpdateApplicationResult,
  UpdateApplicationError,
  DeleteApplicationDataResult,
  DeleteApplicationDataError,
  SubmitApplicationResult,
  SubmitApplicationError,
} from './types';

export async function createApplication(
  data: JsonObject
): Promise<CreateApplicationResult | CreateApplicationError> {
  try {
    // Validate request data using Zod schema
    // Schema allows partial data and validates all provided fields
    const validatedData = applicationSchema.parse(data);

    // Create application with validated JSON data
    // The model will store the JSON in the data column
    const applicationId = ApplicationModel.createApplication(validatedData);

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
    // Get application record
    const application = ApplicationModel.getApplicationById(id);

    if (!application) {
      return {
        error: 'Not found',
        message: `Application with id ${id} not found`,
      };
    }

    // Get JSON data from the application
    const applicationData = ApplicationModel.getApplicationData(id);

    // Build result with metadata and JSON data
    const result: GetApplicationResult = {
      id: application.id,
      status: application.status,
      createdAt: application.created_at,
      updatedAt: application.updated_at,
      ...applicationData, // Spread the JSON data (primaryDriver, mailingAddress, etc.)
    };

    if (application.submitted_at) {
      result.submittedAt = application.submitted_at;
    }

    // If already submitted, return the existing quote price
    if (application.status === 'submitted' && application.quote_price !== null) {
      result.quotePrice = application.quote_price;
      return result;
    }

    // If not submitted, validate the application data
    if (applicationData) {
      const validationResult = applicationSchema.safeParse(applicationData);

      if (validationResult.success) {
        // Application is valid - calculate and include quote price
        result.quotePrice = generateQuotePrice();
      } else {
        // Application has validation errors - include them in the response
        result.validationErrors = validationResult.error.issues;
      }
    } else {
      // No application data - return validation error
      result.validationErrors = [
        {
          code: 'custom',
          path: [],
          message: 'Application data is missing',
        },
      ];
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

// Helper function to deep merge objects
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (source[key] !== undefined) {
      const sourceValue = source[key];
      const targetValue = result[key];

      // Handle records (vehicles, additionalDrivers) - merge at record level
      if (key === 'vehicles' || key === 'additionalDrivers') {
        const targetRecord = (targetValue as Record<string, unknown>) || {};
        const sourceRecord = (sourceValue as Record<string, unknown>) || {};

        // Merge records: combine keys, and deep merge values if same key exists
        const mergedRecord: Record<string, unknown> = { ...targetRecord };
        for (const recordKey in sourceRecord) {
          if (
            targetRecord[recordKey] &&
            typeof targetRecord[recordKey] === 'object' &&
            !Array.isArray(targetRecord[recordKey])
          ) {
            // Deep merge the nested object
            mergedRecord[recordKey] = deepMerge(
              targetRecord[recordKey] as Record<string, unknown>,
              sourceRecord[recordKey] as Record<string, unknown>
            );
          } else {
            // Replace or add new
            mergedRecord[recordKey] = sourceRecord[recordKey];
          }
        }
        result[key] = mergedRecord as T[Extract<keyof T, string>];
      }
      // Deep merge nested objects (primaryDriver, mailingAddress, etc.)
      else if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else {
        // Replace primitive or simple value
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

export async function updateApplication(
  id: string,
  data: JsonObject
): Promise<UpdateApplicationResult | UpdateApplicationError> {
  try {
    // Validate partial update data (schema allows partial)
    const validatedPartialData = applicationSchema.parse(data);

    // Get existing application record
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

    // Use SQLite's json_patch to merge the partial data directly in the database
    // This is more efficient than fetching, merging in JS, and updating
    ApplicationModel.patchApplicationData(id, validatedPartialData);

    // Fetch the merged data to validate it
    const mergedData = ApplicationModel.getApplicationData(id);

    if (!mergedData) {
      return {
        error: 'Internal server error',
        message: 'Failed to retrieve merged application data',
      };
    }

    // Validate the merged data to ensure it's still valid
    const validatedMergedData = applicationSchema.parse(mergedData);

    // Update with validated data (in case validation changed anything)
    ApplicationModel.updateApplicationData(id, validatedMergedData);

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

export async function deleteApplicationData(
  id: string,
  path: string
): Promise<DeleteApplicationDataResult | DeleteApplicationDataError> {
  try {
    // Validate path is not empty
    if (!path || typeof path !== 'string' || path.trim().length === 0) {
      return {
        error: 'Validation error',
        details: [
          {
            code: 'custom',
            path: ['path'],
            message: 'Path is required and must be a non-empty string',
          },
        ],
      };
    }

    // Get existing application record
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
        message: 'Cannot delete data from a submitted application',
      };
    }

    // Delete the path directly using SQLite's json_remove
    const deleted = ApplicationModel.deleteApplicationDataPath(id, path);

    if (!deleted) {
      return {
        error: 'Validation error',
        details: [
          {
            code: 'custom',
            path: ['path'],
            message: `Path "${path}" does not exist in the application data`,
          },
        ],
      };
    }

    // Get the updated data to check if parent objects are empty and validate
    const updatedData = ApplicationModel.getApplicationData(id);

    if (!updatedData) {
      return {
        error: 'Not found',
        message: `Application data not found for id ${id}`,
      };
    }

    // If we deleted a vehicle or additional driver, check if the parent object is now empty
    // and remove it if so (to avoid validation errors)
    if (path.startsWith('vehicles.')) {
      if (updatedData.vehicles && Object.keys(updatedData.vehicles).length === 0) {
        // Remove empty vehicles object using SQLite
        ApplicationModel.deleteApplicationDataPath(id, 'vehicles');
      }
    }
    if (path.startsWith('additionalDrivers.')) {
      if (
        updatedData.additionalDrivers &&
        Object.keys(updatedData.additionalDrivers).length === 0
      ) {
        // Remove empty additionalDrivers object using SQLite
        ApplicationModel.deleteApplicationDataPath(id, 'additionalDrivers');
      }
    }

    // Get the final data after potential cleanup
    const finalData = ApplicationModel.getApplicationData(id);

    if (!finalData) {
      return {
        error: 'Not found',
        message: `Application data not found for id ${id}`,
      };
    }

    // Validate the updated data is still valid
    // Use safeParse to get detailed validation errors
    const validationResult = applicationSchema.safeParse(finalData);

    if (!validationResult.success) {
      // Log validation errors for debugging
      console.error(
        'Validation error after deletion:',
        JSON.stringify(validationResult.error.issues, null, 2)
      );
      return {
        error: 'Validation error',
        details: validationResult.error.issues,
      };
    }

    return {
      id,
      message: `Successfully deleted data at path "${path}"`,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        error: 'Validation error',
        details: error.issues,
      };
    }

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error deleting application data:', error);
    return {
      error: 'Internal server error',
      message: errorMessage,
    };
  }
}

// Helper function to generate a random quote price (for exercise purposes)
function generateQuotePrice(): number {
  // Generate a random price between $500 and $5000
  return Math.floor(Math.random() * 4500) + 500;
}

export async function submitApplication(
  id: string
): Promise<SubmitApplicationResult | SubmitApplicationError> {
  try {
    // Get existing application record
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
        message: 'Application has already been submitted',
      };
    }

    // Get existing application JSON data to validate it's complete
    const applicationData = ApplicationModel.getApplicationData(id);

    if (!applicationData) {
      return {
        error: 'Validation error',
        details: [
          {
            code: 'custom',
            path: [],
            message: 'Application data is missing or incomplete',
          },
        ],
      };
    }

    // Validate that the application data is complete using the strict submission schema
    // This ensures all required fields are present before submission
    const validationResult = applicationSubmissionSchema.safeParse(applicationData);

    if (!validationResult.success) {
      console.error(
        'Validation error after submission:',
        JSON.stringify(validationResult.error.issues, null, 2)
      );
      return {
        error: 'Validation error',
        details: validationResult.error.issues,
      };
    }

    // Generate a random quote price (as per README requirements)
    const quotePrice = generateQuotePrice();

    // Submit the application (update status, set submitted_at, and quote_price)
    ApplicationModel.submitApplication(id, quotePrice);

    return {
      id,
      quotePrice,
      message: 'Application submitted successfully',
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        error: 'Validation error',
        details: error.issues,
      };
    }

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error submitting application:', error);
    return {
      error: 'Internal server error',
      message: errorMessage,
    };
  }
}
