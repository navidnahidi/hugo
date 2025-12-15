// Load test environment variables from .env.test
// This ensures environment variables are available for HTTP helpers
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

// HTTP helper functions
export const del = async (url: string, body: unknown) =>
  fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

export const post = async (url: string, body: unknown) =>
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

export const patch = async (url: string, body: unknown) =>
  fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

export const get = async (url: string) => fetch(url);

// Base URL for API requests
// Uses PORT from .env.test (defaults to 3001)
export const url = `http://localhost:${process.env.PORT || 3001}`;

// Helper to safely get date string in YYYY-MM-DD format
export function getDateString(date: Date): string {
  const dateStr = date.toISOString().split('T')[0];
  if (!dateStr) {
    throw new Error('Failed to format date');
  }
  return dateStr;
}
