import type { Context, Next } from 'koa';
import { ApplicationError } from '../errors/application';

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
        break;
      case 'Not found':
        ctx.status = 404;
        break;
      case 'Forbidden':
        ctx.status = 403;
        break;
      case 'Internal server error':
        ctx.status = 500;
        break;
      default:
        ctx.status = 500;
    }

    ctx.body = result;
  } else {
    // Success result
    ctx.status = 200;
    ctx.body = result;
  }
}
