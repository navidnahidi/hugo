import { ZodError } from 'zod';

// Type for unvalidated JSON input
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

// Result types
export interface CreateApplicationResult {
  id: string;
  message: string;
}

export interface GetApplicationResult {
  id: string;
  primaryDriver?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
    maritalStatus?: string;
    driversLicense?: {
      number: string;
      state: string;
    };
  };
  mailingAddress?: {
    street?: string;
    unit?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  garagingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  vehicles?: {
    [id: string]: {
      make?: string;
      model?: string;
      year?: number;
      vin?: string;
    };
  };
  additionalDrivers?: {
    [id: string]: {
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
      gender?: string;
      relationship?: string;
    };
  };
  status: string;
  submittedAt?: string;
  quotePrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateApplicationResult {
  id: string;
  message: string;
}

// Error types
export interface ValidationError {
  error: 'Validation error';
  details: ZodError['issues'];
}

export interface ServerError {
  error: 'Internal server error';
  message: string;
}

export interface NotFoundError {
  error: 'Not found';
  message: string;
}

export interface ForbiddenError {
  error: 'Forbidden';
  message: string;
}

// Error union types
export type CreateApplicationError = ValidationError | ServerError;
export type GetApplicationError = NotFoundError | ServerError;
export type UpdateApplicationError = NotFoundError | ForbiddenError | ValidationError | ServerError;
