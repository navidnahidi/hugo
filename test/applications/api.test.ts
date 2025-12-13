import dotenv from 'dotenv';
import { expect, test, beforeAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

// Load test environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Run migrations before tests
beforeAll(async () => {
  // Clean up test database if it exists
  const testDbPath = process.env.TEST_DB_PATH || path.join(process.cwd(), 'test.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // Run migrations on test database
  try {
    await execAsync('npm run migrate', {
      env: { ...process.env, NODE_ENV: 'test' },
    });
  } catch (error) {
    console.error('Failed to run migrations:', error);
  }
});

const del = async (url: string, body: any) =>
  fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

const post = async (url: string, body: any) =>
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

const patch = async (url: string, body: any) =>
  fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

test('should be able to start, update, and submit an application', async () => {
  const url = `http://localhost:${process.env.PORT || 3000}`;

  let response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1980-06-01',
    },
  });

  let body = await response.json();

  expect(response.status).toBe(200);
  const { id } = body;
  expect(id).toBeDefined();

  response = await patch(`${url}/applications/${id}`, {
    primaryDriver: {
      gender: 'male',
      maritalStatus: 'single',
      driversLicense: {
        number: 'ABC123456',
        state: 'CA',
      },
    },
  });

  expect(response.status).toBe(200);

  response = await patch(`${url}/applications/${id}`, {
    mailingAddress: {
      street: '123 Test St',
      city: 'Testville',
      state: 'CA',
      zip: '12345',
    },
    garagingAddress: {
      street: '123 Test St',
      city: 'Testville',
      state: 'CA',
      zip: '12345',
    },
    vehicles: {
      ABC123: {
        make: 'Toyota',
        model: 'Corolla',
        year: 2010,
        vin: 'SHSRD78833U127404',
      },
      DEF456: {
        make: 'Honda',
        model: 'Civic',
        year: 2012,
        vin: '1HGFA16588L000000',
      },
    },
  });

  expect(response.status).toBe(200);

  response = await del(`${url}/applications/${id}/data`, {
    path: 'vehicles.ABC123',
  });

  expect(response.status).toBe(200);

  response = await post(`${url}/applications/${id}/submit`, {});

  expect(response.status).toBe(200);
  body = await response.json();
  expect(body.quotePrice).toBeDefined();
  expect(typeof body.quotePrice).toBe('number');
  expect(body.quotePrice).toBeGreaterThan(0);
});
