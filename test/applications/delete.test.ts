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
  const testDbPath = process.env.TEST_DB_PATH || 'test.db';
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

const get = async (url: string) => fetch(url);

const url = `http://localhost:${process.env.PORT || 3000}`;

test('should not allow deleting data from a submitted application', async () => {
  // Create and complete an application
  let response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1980-06-01',
      gender: 'male',
      maritalStatus: 'single',
      driversLicense: {
        number: 'ABC123456',
        state: 'CA',
      },
    },
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
    },
  });

  let body = await response.json();
  expect(response.status).toBe(200);
  const { id } = body;
  expect(id).toBeDefined();

  // Submit the application
  response = await post(`${url}/applications/${id}/submit`, {});
  expect(response.status).toBe(200);
  body = await response.json();
  expect(body.quotePrice).toBeDefined();

  // Try to delete data from the submitted application
  response = await del(`${url}/applications/${id}/data`, {
    path: 'primaryDriver.gender',
  });

  // Should return 403 Forbidden
  expect(response.status).toBe(403);
  body = await response.json();
  expect(body.error).toBe('Forbidden');
  expect(body.message).toBe('Cannot delete data from a submitted application');
});

test('should return error when trying to delete with an invalid path', async () => {
  // Create an application with some data
  let response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1980-06-01',
      gender: 'male',
    },
  });

  let body = await response.json();
  expect(response.status).toBe(200);
  const { id } = body;
  expect(id).toBeDefined();

  // Try to delete a path that doesn't exist
  response = await del(`${url}/applications/${id}/data`, {
    path: 'nonexistent.field',
  });

  // Should return 400 with validation error
  expect(response.status).toBe(400);
  body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
  expect(body.details.length).toBeGreaterThan(0);
  expect(body.details[0]?.message).toContain('does not exist in the application data');
});

test('should return error when trying to delete with empty path', async () => {
  // Create an application
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

  // Try to delete with empty path
  response = await del(`${url}/applications/${id}/data`, {
    path: '',
  });

  // Should return 400 with validation error
  expect(response.status).toBe(400);
  body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
  expect(body.details[0]?.message).toContain('Path is required');
});

test('should return error when trying to delete a nested path that does not exist', async () => {
  // Create an application with some data
  let response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1980-06-01',
    },
    vehicles: {
      ABC123: {
        make: 'Toyota',
        model: 'Corolla',
        year: 2010,
        vin: 'SHSRD78833U127404',
      },
    },
  });

  let body = await response.json();
  expect(response.status).toBe(200);
  const { id } = body;
  expect(id).toBeDefined();

  // Try to delete a vehicle that doesn't exist
  response = await del(`${url}/applications/${id}/data`, {
    path: 'vehicles.NONEXISTENT',
  });

  // Should return 400 with validation error
  expect(response.status).toBe(400);
  body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
  expect(body.details[0]?.message).toContain('does not exist in the application data');
});

test('should successfully delete a valid path from primary driver', async () => {
  // Create an application with primary driver data
  let response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1980-06-01',
      gender: 'male',
      maritalStatus: 'single',
    },
  });

  let body = await response.json();
  expect(response.status).toBe(200);
  const { id } = body;
  expect(id).toBeDefined();

  // Delete the dateOfBirth field from primary driver (as per README example)
  response = await del(`${url}/applications/${id}/data`, {
    path: 'primaryDriver.dateOfBirth',
  });

  // Should return 200
  expect(response.status).toBe(200);
  body = await response.json();
  expect(body.id).toBe(id);

  // Verify the field was deleted by getting the application
  response = await get(`${url}/applications/${id}`);
  expect(response.status).toBe(200);
  body = await response.json();
  expect(body.primaryDriver?.dateOfBirth).toBeUndefined();
  expect(body.primaryDriver?.firstName).toBe('Test');
  expect(body.primaryDriver?.gender).toBe('male');
});

test('should successfully delete a vehicle from vehicles', async () => {
  // Create an application with vehicles
  let response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1980-06-01',
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

  let body = await response.json();
  expect(response.status).toBe(200);
  const { id } = body;
  expect(id).toBeDefined();

  // Delete a vehicle (as per README example)
  response = await del(`${url}/applications/${id}/data`, {
    path: 'vehicles.ABC123',
  });

  // Should return 200
  expect(response.status).toBe(200);
  body = await response.json();
  expect(body.id).toBe(id);

  // Verify the vehicle was deleted by getting the application
  response = await get(`${url}/applications/${id}`);
  expect(response.status).toBe(200);
  body = await response.json();
  expect(body.vehicles?.ABC123).toBeUndefined();
  expect(body.vehicles?.DEF456).toBeDefined();
  expect(body.vehicles?.DEF456?.make).toBe('Honda');
});

test('should successfully delete an additional driver', async () => {
  const minAge16Date = new Date();
  minAge16Date.setFullYear(minAge16Date.getFullYear() - 16);
  const minAge16DateStr = minAge16Date.toISOString().split('T')[0]!;

  // Create an application with additional drivers
  let response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1980-06-01',
    },
    additionalDrivers: {
      DRIVER1: {
        firstName: 'Additional',
        lastName: 'Driver',
        dateOfBirth: minAge16DateStr,
        gender: 'male',
        relationship: 'child',
      },
      DRIVER2: {
        firstName: 'Another',
        lastName: 'Driver',
        dateOfBirth: minAge16DateStr,
        gender: 'female',
        relationship: 'spouse',
      },
    },
  });

  let body = await response.json();
  expect(response.status).toBe(200);
  const { id } = body;
  expect(id).toBeDefined();

  // Delete an additional driver
  response = await del(`${url}/applications/${id}/data`, {
    path: 'additionalDrivers.DRIVER1',
  });

  // Should return 200
  expect(response.status).toBe(200);
  body = await response.json();
  expect(body.id).toBe(id);

  // Verify the driver was deleted by getting the application
  response = await get(`${url}/applications/${id}`);
  expect(response.status).toBe(200);
  body = await response.json();
  expect(body.additionalDrivers?.DRIVER1).toBeUndefined();
  expect(body.additionalDrivers?.DRIVER2).toBeDefined();
  expect(body.additionalDrivers?.DRIVER2?.firstName).toBe('Another');
});
