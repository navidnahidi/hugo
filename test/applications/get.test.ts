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

const get = async (url: string) => fetch(url);

const url = `http://localhost:${process.env.PORT || 3000}`;

test('should return application data with quote price when application is completely valid', async () => {
  // Create a complete, valid application
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

  // Get the application
  response = await get(`${url}/applications/${id}`);

  expect(response.status).toBe(200);
  body = await response.json();

  // Should include all application data
  expect(body.id).toBe(id);
  expect(body.status).toBe('draft');
  expect(body.primaryDriver).toBeDefined();
  expect(body.primaryDriver?.firstName).toBe('Test');
  expect(body.primaryDriver?.lastName).toBe('User');
  expect(body.mailingAddress).toBeDefined();
  expect(body.garagingAddress).toBeDefined();
  expect(body.vehicles).toBeDefined();

  // Should include calculated quote price (since application is valid)
  expect(body.quotePrice).toBeDefined();
  expect(typeof body.quotePrice).toBe('number');
  expect(body.quotePrice).toBeGreaterThan(0);

  // Should NOT include validation errors (since application is valid)
  expect(body.validationErrors).toBeUndefined();
});

test('should return validation errors when application is incomplete', async () => {
  // Create an incomplete application (missing required fields)
  let response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1980-06-01',
      // Missing: gender, maritalStatus, driversLicense
    },
    // Missing: mailingAddress, garagingAddress, vehicles
  });

  let body = await response.json();
  expect(response.status).toBe(200);
  const { id } = body;
  expect(id).toBeDefined();

  // Get the application
  response = await get(`${url}/applications/${id}`);

  expect(response.status).toBe(200);
  body = await response.json();

  // Should include application data
  expect(body.id).toBe(id);
  expect(body.status).toBe('draft');
  expect(body.primaryDriver).toBeDefined();
  expect(body.primaryDriver?.firstName).toBe('Test');

  // Should include validation errors (since application is incomplete)
  expect(body.validationErrors).toBeDefined();
  expect(Array.isArray(body.validationErrors)).toBe(true);
  expect(body.validationErrors.length).toBeGreaterThan(0);

  // Should NOT include quote price (since application is invalid)
  expect(body.quotePrice).toBeUndefined();

  // Verify validation errors indicate what's missing
  const errorPaths = body.validationErrors.map((error: any) => error.path.join('.'));
  expect(errorPaths.some((path: string) => path.includes('primaryDriver.gender'))).toBe(true);
  expect(errorPaths.some((path: string) => path.includes('primaryDriver.maritalStatus'))).toBe(
    true
  );
  expect(errorPaths.some((path: string) => path.includes('primaryDriver.driversLicense'))).toBe(
    true
  );
  expect(errorPaths.some((path: string) => path.includes('mailingAddress'))).toBe(true);
  expect(errorPaths.some((path: string) => path.includes('garagingAddress'))).toBe(true);
  expect(errorPaths.some((path: string) => path.includes('vehicles'))).toBe(true);
});

test('should return existing quote price for submitted application', async () => {
  // Create and submit a complete application
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
  const submittedQuotePrice = body.quotePrice;
  expect(submittedQuotePrice).toBeDefined();

  // Get the submitted application
  response = await get(`${url}/applications/${id}`);

  expect(response.status).toBe(200);
  body = await response.json();

  // Should include application data
  expect(body.id).toBe(id);
  expect(body.status).toBe('submitted');
  expect(body.submittedAt).toBeDefined();

  // Should return the existing quote price (not a new one)
  expect(body.quotePrice).toBeDefined();
  expect(body.quotePrice).toBe(submittedQuotePrice);

  // Should NOT include validation errors (submitted applications are already validated)
  expect(body.validationErrors).toBeUndefined();
});

test('should return validation errors for partially complete application', async () => {
  // Create an application with some fields but not all required ones
  let response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1980-06-01',
      gender: 'male',
      maritalStatus: 'single',
      // Missing: driversLicense
    },
    mailingAddress: {
      street: '123 Test St',
      city: 'Testville',
      state: 'CA',
      zip: '12345',
    },
    // Missing: garagingAddress, vehicles
  });

  let body = await response.json();
  expect(response.status).toBe(200);
  const { id } = body;
  expect(id).toBeDefined();

  // Get the application
  response = await get(`${url}/applications/${id}`);

  expect(response.status).toBe(200);
  body = await response.json();

  // Should include partial application data
  expect(body.id).toBe(id);
  expect(body.primaryDriver?.gender).toBe('male');
  expect(body.mailingAddress).toBeDefined();

  // Should include validation errors for missing fields
  expect(body.validationErrors).toBeDefined();
  expect(Array.isArray(body.validationErrors)).toBe(true);
  expect(body.validationErrors.length).toBeGreaterThan(0);

  // Should NOT include quote price
  expect(body.quotePrice).toBeUndefined();

  // Verify specific missing fields are in validation errors
  const errorPaths = body.validationErrors.map((error: any) => error.path.join('.'));
  expect(errorPaths.some((path: string) => path.includes('primaryDriver.driversLicense'))).toBe(
    true
  );
  expect(errorPaths.some((path: string) => path.includes('garagingAddress'))).toBe(true);
  expect(errorPaths.some((path: string) => path.includes('vehicles'))).toBe(true);
});

test('should return validation errors when application has invalid data', async () => {
  // Create an application with incomplete data
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

  // Get the application to check validation errors
  response = await get(`${url}/applications/${id}`);

  expect(response.status).toBe(200);
  body = await response.json();

  // Should include application data
  expect(body.id).toBe(id);
  expect(body.status).toBe('draft');
  expect(body.primaryDriver).toBeDefined();
  expect(body.primaryDriver?.firstName).toBe('Test');

  // Should include validation errors
  expect(body.validationErrors).toBeDefined();
  expect(Array.isArray(body.validationErrors)).toBe(true);
  expect(body.validationErrors.length).toBeGreaterThan(0);

  // Should NOT include quote price (since application is invalid)
  expect(body.quotePrice).toBeUndefined();

  // Verify validation errors check for the right things - all required fields
  const errorPaths = body.validationErrors.map((error: any) => error.path.join('.'));

  // Check for primary driver required fields
  expect(errorPaths.some((path: string) => path.includes('primaryDriver.gender'))).toBe(true);
  expect(errorPaths.some((path: string) => path.includes('primaryDriver.maritalStatus'))).toBe(
    true
  );
  expect(errorPaths.some((path: string) => path.includes('primaryDriver.driversLicense'))).toBe(
    true
  );

  // Check for required addresses
  expect(errorPaths.some((path: string) => path.includes('mailingAddress'))).toBe(true);
  expect(errorPaths.some((path: string) => path.includes('garagingAddress'))).toBe(true);

  // Check for required vehicles (must have at least 1)
  expect(errorPaths.some((path: string) => path.includes('vehicles'))).toBe(true);

  // Verify error structure - each error should have required properties
  body.validationErrors.forEach((error: any) => {
    expect(error).toHaveProperty('code');
    expect(error).toHaveProperty('path');
    expect(error).toHaveProperty('message');
    expect(Array.isArray(error.path)).toBe(true);
    expect(typeof error.message).toBe('string');
    expect(error.message.length).toBeGreaterThan(0);
  });
});

test('should return 404 for non-existent application', async () => {
  // Try to get an application that doesn't exist
  const response = await get(`${url}/applications/non-existent-id`);

  // Should return 404 Not Found
  expect(response.status).toBe(404);
  const body = await response.json();
  expect(body.error).toBe('Not found');
  expect(body.message).toContain('not found');
});

test('should return application with metadata fields', async () => {
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

  // Get the application
  response = await get(`${url}/applications/${id}`);

  expect(response.status).toBe(200);
  body = await response.json();

  // Should include metadata fields
  expect(body.id).toBe(id);
  expect(body.status).toBe('draft');
  expect(body.createdAt).toBeDefined();
  expect(body.updatedAt).toBeDefined();
  expect(typeof body.createdAt).toBe('string');
  expect(typeof body.updatedAt).toBe('string');
});

test('should return quote price when application becomes valid after update', async () => {
  // Create an incomplete application
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

  // Initially should have validation errors
  response = await get(`${url}/applications/${id}`);
  expect(response.status).toBe(200);
  body = await response.json();
  expect(body.validationErrors).toBeDefined();
  expect(body.quotePrice).toBeUndefined();

  // Update to make it complete
  response = await patch(`${url}/applications/${id}`, {
    primaryDriver: {
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

  expect(response.status).toBe(200);

  // Now should have quote price and no validation errors
  response = await get(`${url}/applications/${id}`);
  expect(response.status).toBe(200);
  body = await response.json();
  expect(body.quotePrice).toBeDefined();
  expect(typeof body.quotePrice).toBe('number');
  expect(body.quotePrice).toBeGreaterThan(0);
  expect(body.validationErrors).toBeUndefined();
});
