import type { ZodError } from 'zod';

/**
 * Base error class for application errors
 */
export class ApplicationError extends Error {
  public readonly statusCode: number;
  public readonly errorType: string;

  constructor(message: string, statusCode: number, errorType: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorType = errorType;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): { error: string; message?: string; details?: unknown } {
    return {
      error: this.errorType,
      message: this.message,
    };
  }
}

/**
 * Validation error - 400
 */
export class ValidationError extends ApplicationError {
  public readonly details: ZodError['issues'];

  constructor(message: string, details: ZodError['issues']) {
    super(message, 400, 'Validation error');
    this.details = details;
  }

  toJSON() {
    return {
      error: this.errorType,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * Not found error - 404
 */
export class NotFoundError extends ApplicationError {
  constructor(message: string) {
    super(message, 404, 'Not found');
  }
}

/**
 * Forbidden error - 403
 */
export class ForbiddenError extends ApplicationError {
  constructor(message: string) {
    super(message, 403, 'Forbidden');
  }
}

/**
 * Server error - 500
 */
export class ServerError extends ApplicationError {
  constructor(message: string) {
    super(message, 500, 'Internal server error');
  }
}
