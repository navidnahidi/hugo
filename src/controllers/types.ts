import type { ZodError } from 'zod';

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
    zip?: string;
  };
  garagingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
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
  quotePrice?: number; // Calculated price if valid, or existing price if submitted
  validationErrors?: ZodError['issues']; // List of validation errors if not complete
  createdAt: string;
  updatedAt: string;
}

export interface UpdateApplicationResult {
  id: string;
  message: string;
}

export interface DeleteApplicationDataResult {
  id: string;
  message: string;
}

export interface SubmitApplicationResult {
  id: string;
  quotePrice: number;
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
export type DeleteApplicationDataError =
  | NotFoundError
  | ForbiddenError
  | ValidationError
  | ServerError;
export type SubmitApplicationError = NotFoundError | ForbiddenError | ValidationError | ServerError;
