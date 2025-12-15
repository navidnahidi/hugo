import type { Context, Next } from 'koa';
import { ApplicationError } from '../errors/application';
import type { ZodIssue } from 'zod';

/**
 * Format Zod validation issues into a user-friendly message
 */
function formatValidationMessage(details: ZodIssue[]): string {
  if (details.length === 0) {
    return 'Validation failed';
  }

  if (details.length === 1) {
    const issue = details[0];
    if (!issue) {
      return 'Validation failed';
    }
    const path = issue.path.length > 0 ? issue.path.join('.') : 'field';
    return `Validation error: ${path} - ${issue.message}`;
  }

  // Multiple errors - create a summary
  const fieldErrors = details.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'field';
    return `${path}: ${issue.message}`;
  });

  return `Validation failed for ${details.length} field(s): ${fieldErrors.join('; ')}`;
}

/**
 * Error handling middleware
 * Catches ApplicationError instances and formats the response appropriately
 */
export async function errorHandler(ctx: Context, next: Next): Promise<void> {
  try {
    await next();
  } catch (error) {
    // Handle ApplicationError instances
    if (error instanceof ApplicationError) {
      ctx.status = error.statusCode;
      ctx.body = error.toJSON();
      return;
    }

    // Handle unexpected errors
    console.error('Unexpected error:', error);
    ctx.status = 500;
    ctx.body = {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Helper to handle result objects that may contain errors
 * This allows controllers to return either success results or error objects
 */
export function handleResult<T>(
  ctx: Context,
  result: T | { error: string; message?: string; details?: unknown }
): void {
  // Check if result is an error object
  if (result && typeof result === 'object' && 'error' in result) {
    const error = result as { error: string; message?: string; details?: unknown };

    // Map error types to status codes
    switch (error.error) {
      case 'Validation error':
        ctx.status = 400;
        // Format validation errors with a descriptive message
        if (error.details && Array.isArray(error.details)) {
          const formattedMessage = formatValidationMessage(error.details as ZodIssue[]);
          ctx.body = {
            error: error.error,
            message: formattedMessage,
            details: error.details,
          };
        } else {
          ctx.body = result;
        }
        break;
      case 'Not found':
        ctx.status = 404;
        ctx.body = result;
        break;
      case 'Forbidden':
        ctx.status = 403;
        ctx.body = result;
        break;
      case 'Internal server error':
        ctx.status = 500;
        ctx.body = result;
        break;
      default:
        ctx.status = 500;
        ctx.body = result;
    }
  } else {
    // Success result
    ctx.status = 200;
    ctx.body = result;
  }
}
