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

const url = `http://localhost:${process.env.PORT || 3000}`;

test('should create an application with partial data', async () => {
  // Create an application with only partial data
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1980-06-01',
      // Missing: gender, maritalStatus, driversLicense
    },
    // Missing: mailingAddress, garagingAddress, vehicles
  });

  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.id).toBeDefined();
  expect(typeof body.id).toBe('string');
  expect(body.id.length).toBeGreaterThan(0);
});

test('should create an application with complete data', async () => {
  // Create an application with all required fields
  const response = await post(`${url}/applications`, {
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

  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.id).toBeDefined();
  expect(typeof body.id).toBe('string');
});

test('should submit a complete application and return quote price', async () => {
  // Create a complete application
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

  // Should return 200 with quote price
  expect(response.status).toBe(200);
  body = await response.json();
  expect(body.id).toBe(id);
  expect(body.quotePrice).toBeDefined();
  expect(typeof body.quotePrice).toBe('number');
  expect(body.quotePrice).toBeGreaterThan(0);
  expect(body.message).toBe('Application submitted successfully');
});

test('should return validation errors when submitting an incomplete application', async () => {
  // Create an application with only partial data (missing required fields)
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

  // Try to submit the incomplete application
  response = await post(`${url}/applications/${id}/submit`, {});

  // Should return 400 with validation errors
  expect(response.status).toBe(400);
  body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
  expect(body.details.length).toBeGreaterThan(0);

  // Verify the validation errors indicate what's missing
  const errorPaths = body.details.map((detail: any) => detail.path.join('.'));

  // Should include errors for missing required fields
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

  // Verify the message explains what needs to be fixed
  expect(body.message).toBeDefined();
  expect(typeof body.message).toBe('string');
  expect(body.message.length).toBeGreaterThan(0);
});

test('should not allow submitting an already submitted application', async () => {
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

  // Submit the application first time
  response = await post(`${url}/applications/${id}/submit`, {});
  expect(response.status).toBe(200);
  body = await response.json();
  expect(body.quotePrice).toBeDefined();
  const firstQuotePrice = body.quotePrice;

  // Try to submit again
  response = await post(`${url}/applications/${id}/submit`, {});

  // Should return 403 Forbidden
  expect(response.status).toBe(403);
  body = await response.json();
  expect(body.error).toBe('Forbidden');
  expect(body.message).toBe('Application has already been submitted');
});

test('should create an application with minimal required fields for primary driver', async () => {
  // Create an application with only the minimum fields
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1980-06-01',
    },
  });

  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.id).toBeDefined();
  expect(typeof body.id).toBe('string');
});

test('should create an application with vehicles and additional drivers', async () => {
  const minAge16Date = new Date();
  minAge16Date.setFullYear(minAge16Date.getFullYear() - 16);
  const minAge16DateStr = minAge16Date.toISOString().split('T')[0]!;

  // Create an application with vehicles and additional drivers
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1980-06-01',
    },
    vehicles: {
      VEH1: {
        make: 'Toyota',
        model: 'Corolla',
        year: 2010,
        vin: 'SHSRD78833U127404',
      },
      VEH2: {
        make: 'Honda',
        model: 'Civic',
        year: 2012,
        vin: '1HGFA16588L000000',
      },
    },
    additionalDrivers: {
      DRIVER1: {
        firstName: 'Additional',
        lastName: 'Driver',
        dateOfBirth: minAge16DateStr,
        gender: 'male',
        relationship: 'child',
      },
    },
  });

  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.id).toBeDefined();
  expect(typeof body.id).toBe('string');
});
