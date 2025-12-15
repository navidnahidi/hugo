import dotenv from 'dotenv';
import { beforeAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

// Load test environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Explicitly set TEST_DB_PATH to ensure tests use test database
// This ensures the server (if running) also uses test.db when tests run
if (!process.env.TEST_DB_PATH) {
  process.env.TEST_DB_PATH = path.join(process.cwd(), 'test.db');
}

// Run migrations before tests
beforeAll(async () => {
  // Clean up test database if it exists
  const testDbPath = process.env.TEST_DB_PATH || path.join(process.cwd(), 'test.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // Run migrations on test database
  // NODE_ENV=test is already set above, so migrations will use test.db
  try {
    await execAsync('npm run migrate', {
      env: { ...process.env, NODE_ENV: 'test' },
    });
  } catch (error) {
    console.error('Failed to run migrations:', error);
  }
});

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
export const url = `http://localhost:${process.env.PORT || 3000}`;

// Helper to safely get date string in YYYY-MM-DD format
export function getDateString(date: Date): string {
  const dateStr = date.toISOString().split('T')[0];
  if (!dateStr) {
    throw new Error('Failed to format date');
  }
  return dateStr;
}
