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
const currentYear = new Date().getFullYear();
const minAge18Date = new Date();
minAge18Date.setFullYear(minAge18Date.getFullYear() - 18);
const minAge18DateStr = minAge18Date.toISOString().split('T')[0]!;

// Helper to create a valid application for PATCH tests
async function createValidApplication() {
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: minAge18DateStr,
    },
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  return body.id as string;
}

// ========== PRIMARY DRIVER VALIDATION TESTS ==========

test('POST /applications should reject invalid date format (timestamp)', async () => {
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1980-06-01T00:00:00Z', // Invalid: timestamp
    },
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.message).toContain('YYYY-MM-DD');
  expect(body.message).toContain('dateOfBirth');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});

test('POST /applications should reject primary driver too young (< 18)', async () => {
  const tooYoungDate = new Date();
  tooYoungDate.setFullYear(tooYoungDate.getFullYear() - 17);
  const tooYoungDateStr = tooYoungDate.toISOString().split('T')[0]!;
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: tooYoungDateStr,
    },
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.message).toContain('18 years old');
  expect(body.message).toContain('dateOfBirth');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});

test('POST /applications should reject invalid gender', async () => {
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: minAge18DateStr,
      gender: 'invalid-gender',
    },
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.message).toContain('Invalid option');
  expect(body.message).toContain('gender');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});

test('POST /applications should reject invalid marital status', async () => {
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: minAge18DateStr,
      maritalStatus: 'invalid-status',
    },
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.message).toContain('Marital status must be one of');
  expect(body.message).toContain('maritalStatus');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});

test('POST /applications should reject driver license number not 9 chars', async () => {
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: minAge18DateStr,
      driversLicense: {
        number: 'ABC12345', // 8 chars, should be 9
        state: 'CA',
      },
    },
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.message).toContain('9 characters');
  expect(body.message).toContain('number');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});

test('POST /applications should reject driver license number lowercase', async () => {
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: minAge18DateStr,
      driversLicense: {
        number: 'abc123456', // lowercase
        state: 'CA',
      },
    },
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.message).toContain('uppercase');
  expect(body.message).toContain('number');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});

test('POST /applications should reject invalid driver license state', async () => {
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: minAge18DateStr,
      driversLicense: {
        number: 'ABC123456',
        state: 'XX', // Invalid state
      },
    },
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.message).toContain('US state');
  expect(body.message).toContain('state');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});

// ========== VEHICLE VALIDATION TESTS ==========

test('POST /applications should reject vehicle year before 1985', async () => {
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: minAge18DateStr,
    },
    vehicles: {
      ABC123: {
        make: 'Toyota',
        model: 'Corolla',
        year: 1984, // Too old
        vin: 'SHSRD78833U127404',
      },
    },
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.message).toContain('1985 or later');
  expect(body.message).toContain('year');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});

test('POST /applications should reject vehicle year after current year + 1', async () => {
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: minAge18DateStr,
    },
    vehicles: {
      ABC123: {
        make: 'Toyota',
        model: 'Corolla',
        year: currentYear + 2, // Too new
        vin: 'SHSRD78833U127404',
      },
    },
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation error');
  const nextYear = currentYear + 1;
  expect(body.message).toContain('or earlier');
  expect(body.message).toContain('year');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});

test('POST /applications should reject VIN not 17 characters', async () => {
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: minAge18DateStr,
    },
    vehicles: {
      ABC123: {
        make: 'Toyota',
        model: 'Corolla',
        year: 2010,
        vin: 'SHSRD78833U12740', // 16 chars, should be 17
      },
    },
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.message).toContain('17 characters');
  expect(body.message).toContain('vin');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});

test('POST /applications should reject VIN containing I', async () => {
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: minAge18DateStr,
    },
    vehicles: {
      ABC123: {
        make: 'Toyota',
        model: 'Corolla',
        year: 2010,
        vin: 'SHSRD78833I127404', // Contains I
      },
    },
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.message).toContain('I, O, Q are not allowed');
  expect(body.message).toContain('vin');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});

test('POST /applications should reject VIN containing O', async () => {
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: minAge18DateStr,
    },
    vehicles: {
      ABC123: {
        make: 'Toyota',
        model: 'Corolla',
        year: 2010,
        vin: 'SHSRD78833O127404', // Contains O
      },
    },
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.message).toContain('I, O, Q are not allowed');
  expect(body.message).toContain('vin');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});

test('POST /applications should reject VIN containing Q', async () => {
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: minAge18DateStr,
    },
    vehicles: {
      ABC123: {
        make: 'Toyota',
        model: 'Corolla',
        year: 2010,
        vin: 'SHSRD78833Q127404', // Contains Q
      },
    },
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.message).toContain('I, O, Q are not allowed');
  expect(body.message).toContain('vin');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});

test('POST /applications should reject more than 3 vehicles', async () => {
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: minAge18DateStr,
    },
    vehicles: {
      V1: { make: 'Toyota', model: 'Corolla', year: 2010, vin: 'SHSRD78833U127404' },
      V2: { make: 'Honda', model: 'Civic', year: 2012, vin: '1HGFA16588L000000' },
      V3: { make: 'Ford', model: 'Focus', year: 2015, vin: '1FAHP3F20CL123456' },
      V4: { make: 'Chevy', model: 'Malibu', year: 2018, vin: '1G1ZD5ST0JF123456' }, // 4th vehicle
    },
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.message).toContain('vehicles');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});

// ========== ADDRESS VALIDATION TESTS ==========

test('POST /applications should reject zip code not 5 digits', async () => {
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: minAge18DateStr,
    },
    mailingAddress: {
      street: '123 Test St',
      city: 'Testville',
      state: 'CA',
      zip: '1234', // 4 digits
    },
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.message).toContain('5 digits');
  expect(body.message).toContain('zip');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});

test('POST /applications should reject zip code with letters', async () => {
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: minAge18DateStr,
    },
    mailingAddress: {
      street: '123 Test St',
      city: 'Testville',
      state: 'CA',
      zip: '1234A', // Contains letter
    },
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.message).toContain('5 digits');
  expect(body.message).toContain('zip');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});

test('POST /applications should reject invalid state in mailing address', async () => {
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: minAge18DateStr,
    },
    mailingAddress: {
      street: '123 Test St',
      city: 'Testville',
      state: 'XX', // Invalid state
      zip: '12345',
    },
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.message).toContain('US state');
  expect(body.message).toContain('state');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});

test('POST /applications should reject invalid state in garaging address', async () => {
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: minAge18DateStr,
    },
    garagingAddress: {
      street: '123 Test St',
      city: 'Testville',
      state: 'YY', // Invalid state
      zip: '12345',
    },
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.message).toContain('US state');
  expect(body.message).toContain('state');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});

// ========== ADDITIONAL DRIVERS VALIDATION TESTS ==========

test('POST /applications should reject additional driver too young (< 16)', async () => {
  const tooYoung16Date = new Date();
  tooYoung16Date.setFullYear(tooYoung16Date.getFullYear() - 15);
  const tooYoung16DateStr = tooYoung16Date.toISOString().split('T')[0]!;
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: minAge18DateStr,
    },
    additionalDrivers: {
      DRIVER1: {
        firstName: 'Additional',
        lastName: 'Driver',
        dateOfBirth: tooYoung16DateStr, // Too young
        gender: 'male',
        relationship: 'child',
      },
    },
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.message).toContain('16 years old');
  expect(body.message).toContain('dateOfBirth');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});

test('POST /applications should reject invalid relationship', async () => {
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: minAge18DateStr,
    },
    additionalDrivers: {
      DRIVER1: {
        firstName: 'Additional',
        lastName: 'Driver',
        dateOfBirth: minAge18DateStr,
        gender: 'male',
        relationship: 'friend', // Invalid relationship
      },
    },
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.message).toContain('Relationship must be one of');
  expect(body.message).toContain('relationship');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});

test('POST /applications should reject more than 3 additional drivers', async () => {
  const minAge16Date = new Date();
  minAge16Date.setFullYear(minAge16Date.getFullYear() - 16);
  const minAge16DateStr = minAge16Date.toISOString().split('T')[0]!;
  const response = await post(`${url}/applications`, {
    primaryDriver: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: minAge18DateStr,
    },
    additionalDrivers: {
      D1: {
        firstName: 'Driver',
        lastName: 'One',
        dateOfBirth: minAge16DateStr,
        gender: 'male',
        relationship: 'child',
      },
      D2: {
        firstName: 'Driver',
        lastName: 'Two',
        dateOfBirth: minAge16DateStr,
        gender: 'female',
        relationship: 'child',
      },
      D3: {
        firstName: 'Driver',
        lastName: 'Three',
        dateOfBirth: minAge16DateStr,
        gender: 'male',
        relationship: 'child',
      },
      D4: {
        firstName: 'Driver',
        lastName: 'Four',
        dateOfBirth: minAge16DateStr,
        gender: 'female',
        relationship: 'child',
      }, // 4th driver
    },
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.message).toContain('additionalDrivers');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});

// ========== PATCH VALIDATION TESTS ==========

test('PATCH /applications/:id should reject invalid date format (timestamp)', async () => {
  const id = await createValidApplication();
  const response = await patch(`${url}/applications/${id}`, {
    primaryDriver: {
      dateOfBirth: '1980-06-01T00:00:00Z', // Invalid: timestamp
    },
  });
  expect(response.status).toBe(400);
  const errorBody = await response.json();
  expect(errorBody.error).toBe('Validation error');
  expect(errorBody.message).toContain('YYYY-MM-DD');
  expect(errorBody.message).toContain('dateOfBirth');
  expect(errorBody.details).toBeDefined();
  expect(Array.isArray(errorBody.details)).toBe(true);
});

test('PATCH /applications/:id should reject primary driver too young (< 18)', async () => {
  const id = await createValidApplication();
  const tooYoungDate = new Date();
  tooYoungDate.setFullYear(tooYoungDate.getFullYear() - 17);
  const tooYoungDateStr = tooYoungDate.toISOString().split('T')[0]!;
  const response = await patch(`${url}/applications/${id}`, {
    primaryDriver: {
      dateOfBirth: tooYoungDateStr,
    },
  });
  expect(response.status).toBe(400);
  const errorBody = await response.json();
  expect(errorBody.error).toBe('Validation error');
  expect(errorBody.message).toContain('18 years old');
  expect(errorBody.message).toContain('dateOfBirth');
  expect(errorBody.details).toBeDefined();
  expect(Array.isArray(errorBody.details)).toBe(true);
});

test('PATCH /applications/:id should reject invalid gender', async () => {
  const id = await createValidApplication();
  const response = await patch(`${url}/applications/${id}`, {
    primaryDriver: {
      gender: 'invalid-gender',
    },
  });
  expect(response.status).toBe(400);
  const errorBody = await response.json();
  expect(errorBody.error).toBe('Validation error');
  expect(errorBody.message).toContain('Invalid option');
  expect(errorBody.message).toContain('gender');
  expect(errorBody.details).toBeDefined();
  expect(Array.isArray(errorBody.details)).toBe(true);
});

test('PATCH /applications/:id should reject invalid marital status', async () => {
  const id = await createValidApplication();
  const response = await patch(`${url}/applications/${id}`, {
    primaryDriver: {
      maritalStatus: 'invalid-status',
    },
  });
  expect(response.status).toBe(400);
  const errorBody = await response.json();
  expect(errorBody.error).toBe('Validation error');
  expect(errorBody.message).toContain('Marital status must be one of');
  expect(errorBody.message).toContain('maritalStatus');
  expect(errorBody.details).toBeDefined();
  expect(Array.isArray(errorBody.details)).toBe(true);
});

test('PATCH /applications/:id should reject driver license number not 9 chars', async () => {
  const id = await createValidApplication();
  const response = await patch(`${url}/applications/${id}`, {
    primaryDriver: {
      driversLicense: {
        number: 'ABC12345', // 8 chars, should be 9
        state: 'CA',
      },
    },
  });
  expect(response.status).toBe(400);
  const errorBody = await response.json();
  expect(errorBody.error).toBe('Validation error');
  expect(errorBody.message).toContain('9 characters');
  expect(errorBody.message).toContain('number');
  expect(errorBody.details).toBeDefined();
  expect(Array.isArray(errorBody.details)).toBe(true);
});

test('PATCH /applications/:id should reject driver license number lowercase', async () => {
  const id = await createValidApplication();
  const response = await patch(`${url}/applications/${id}`, {
    primaryDriver: {
      driversLicense: {
        number: 'abc123456', // lowercase
        state: 'CA',
      },
    },
  });
  expect(response.status).toBe(400);
  const errorBody = await response.json();
  expect(errorBody.error).toBe('Validation error');
  expect(errorBody.message).toContain('uppercase');
  expect(errorBody.message).toContain('number');
  expect(errorBody.details).toBeDefined();
  expect(Array.isArray(errorBody.details)).toBe(true);
});

test('PATCH /applications/:id should reject invalid driver license state', async () => {
  const id = await createValidApplication();
  const response = await patch(`${url}/applications/${id}`, {
    primaryDriver: {
      driversLicense: {
        number: 'ABC123456',
        state: 'XX', // Invalid state
      },
    },
  });
  expect(response.status).toBe(400);
  const errorBody = await response.json();
  expect(errorBody.error).toBe('Validation error');
  expect(errorBody.message).toContain('US state');
  expect(errorBody.message).toContain('state');
  expect(errorBody.details).toBeDefined();
  expect(Array.isArray(errorBody.details)).toBe(true);
});

test('PATCH /applications/:id should reject vehicle year before 1985', async () => {
  const id = await createValidApplication();
  const response = await patch(`${url}/applications/${id}`, {
    vehicles: {
      ABC123: {
        make: 'Toyota',
        model: 'Corolla',
        year: 1984, // Too old
        vin: 'SHSRD78833U127404',
      },
    },
  });
  expect(response.status).toBe(400);
  const errorBody = await response.json();
  expect(errorBody.error).toBe('Validation error');
  expect(errorBody.message).toContain('1985 or later');
  expect(errorBody.message).toContain('year');
  expect(errorBody.details).toBeDefined();
  expect(Array.isArray(errorBody.details)).toBe(true);
});

test('PATCH /applications/:id should reject vehicle year after current year + 1', async () => {
  const id = await createValidApplication();
  const response = await patch(`${url}/applications/${id}`, {
    vehicles: {
      ABC123: {
        make: 'Toyota',
        model: 'Corolla',
        year: currentYear + 2, // Too new
        vin: 'SHSRD78833U127404',
      },
    },
  });
  expect(response.status).toBe(400);
  const errorBody = await response.json();
  expect(errorBody.error).toBe('Validation error');
  expect(errorBody.message).toContain('or earlier');
  expect(errorBody.message).toContain('year');
  expect(errorBody.details).toBeDefined();
  expect(Array.isArray(errorBody.details)).toBe(true);
});

test('PATCH /applications/:id should reject VIN not 17 characters', async () => {
  const id = await createValidApplication();
  const response = await patch(`${url}/applications/${id}`, {
    vehicles: {
      ABC123: {
        make: 'Toyota',
        model: 'Corolla',
        year: 2010,
        vin: 'SHSRD78833U12740', // 16 chars, should be 17
      },
    },
  });
  expect(response.status).toBe(400);
  const errorBody = await response.json();
  expect(errorBody.error).toBe('Validation error');
  expect(errorBody.message).toContain('17 characters');
  expect(errorBody.message).toContain('vin');
  expect(errorBody.details).toBeDefined();
  expect(Array.isArray(errorBody.details)).toBe(true);
});

test('PATCH /applications/:id should reject VIN containing I', async () => {
  const id = await createValidApplication();
  const response = await patch(`${url}/applications/${id}`, {
    vehicles: {
      ABC123: {
        make: 'Toyota',
        model: 'Corolla',
        year: 2010,
        vin: 'SHSRD78833I127404', // Contains I
      },
    },
  });
  expect(response.status).toBe(400);
  const errorBody = await response.json();
  expect(errorBody.error).toBe('Validation error');
  expect(errorBody.message).toContain('I, O, Q are not allowed');
  expect(errorBody.message).toContain('vin');
  expect(errorBody.details).toBeDefined();
  expect(Array.isArray(errorBody.details)).toBe(true);
});

test('PATCH /applications/:id should reject VIN containing O', async () => {
  const id = await createValidApplication();
  const response = await patch(`${url}/applications/${id}`, {
    vehicles: {
      ABC123: {
        make: 'Toyota',
        model: 'Corolla',
        year: 2010,
        vin: 'SHSRD78833O127404', // Contains O
      },
    },
  });
  expect(response.status).toBe(400);
  const errorBody = await response.json();
  expect(errorBody.error).toBe('Validation error');
  expect(errorBody.message).toContain('I, O, Q are not allowed');
  expect(errorBody.message).toContain('vin');
  expect(errorBody.details).toBeDefined();
  expect(Array.isArray(errorBody.details)).toBe(true);
});

test('PATCH /applications/:id should reject VIN containing Q', async () => {
  const id = await createValidApplication();
  const response = await patch(`${url}/applications/${id}`, {
    vehicles: {
      ABC123: {
        make: 'Toyota',
        model: 'Corolla',
        year: 2010,
        vin: 'SHSRD78833Q127404', // Contains Q
      },
    },
  });
  expect(response.status).toBe(400);
  const errorBody = await response.json();
  expect(errorBody.error).toBe('Validation error');
  expect(errorBody.message).toContain('I, O, Q are not allowed');
  expect(errorBody.message).toContain('vin');
  expect(errorBody.details).toBeDefined();
  expect(Array.isArray(errorBody.details)).toBe(true);
});

test('PATCH /applications/:id should reject zip code not 5 digits', async () => {
  const id = await createValidApplication();
  const response = await patch(`${url}/applications/${id}`, {
    mailingAddress: {
      street: '123 Test St',
      city: 'Testville',
      state: 'CA',
      zip: '1234', // 4 digits
    },
  });
  expect(response.status).toBe(400);
  const errorBody = await response.json();
  expect(errorBody.error).toBe('Validation error');
  expect(errorBody.message).toContain('5 digits');
  expect(errorBody.message).toContain('zip');
  expect(errorBody.details).toBeDefined();
  expect(Array.isArray(errorBody.details)).toBe(true);
});

test('PATCH /applications/:id should reject zip code with letters', async () => {
  const id = await createValidApplication();
  const response = await patch(`${url}/applications/${id}`, {
    mailingAddress: {
      street: '123 Test St',
      city: 'Testville',
      state: 'CA',
      zip: '1234A', // Contains letter
    },
  });
  expect(response.status).toBe(400);
  const errorBody = await response.json();
  expect(errorBody.error).toBe('Validation error');
  expect(errorBody.message).toContain('5 digits');
  expect(errorBody.message).toContain('zip');
  expect(errorBody.details).toBeDefined();
  expect(Array.isArray(errorBody.details)).toBe(true);
});

test('PATCH /applications/:id should reject invalid state in mailing address', async () => {
  const id = await createValidApplication();
  const response = await patch(`${url}/applications/${id}`, {
    mailingAddress: {
      street: '123 Test St',
      city: 'Testville',
      state: 'XX', // Invalid state
      zip: '12345',
    },
  });
  expect(response.status).toBe(400);
  const errorBody = await response.json();
  expect(errorBody.error).toBe('Validation error');
  expect(errorBody.message).toContain('US state');
  expect(errorBody.message).toContain('state');
  expect(errorBody.details).toBeDefined();
  expect(Array.isArray(errorBody.details)).toBe(true);
});

test('PATCH /applications/:id should reject invalid state in garaging address', async () => {
  const id = await createValidApplication();
  const response = await patch(`${url}/applications/${id}`, {
    garagingAddress: {
      street: '123 Test St',
      city: 'Testville',
      state: 'YY', // Invalid state
      zip: '12345',
    },
  });
  expect(response.status).toBe(400);
  const errorBody = await response.json();
  expect(errorBody.error).toBe('Validation error');
  expect(errorBody.message).toContain('US state');
  expect(errorBody.message).toContain('state');
  expect(errorBody.details).toBeDefined();
  expect(Array.isArray(errorBody.details)).toBe(true);
});

test('PATCH /applications/:id should reject additional driver too young (< 16)', async () => {
  const id = await createValidApplication();
  const tooYoung16Date = new Date();
  tooYoung16Date.setFullYear(tooYoung16Date.getFullYear() - 15);
  const tooYoung16DateStr = tooYoung16Date.toISOString().split('T')[0]!;
  const response = await patch(`${url}/applications/${id}`, {
    additionalDrivers: {
      DRIVER1: {
        firstName: 'Additional',
        lastName: 'Driver',
        dateOfBirth: tooYoung16DateStr, // Too young
        gender: 'male',
        relationship: 'child',
      },
    },
  });
  expect(response.status).toBe(400);
  const errorBody = await response.json();
  expect(errorBody.error).toBe('Validation error');
  expect(errorBody.message).toContain('16 years old');
  expect(errorBody.message).toContain('dateOfBirth');
  expect(errorBody.details).toBeDefined();
  expect(Array.isArray(errorBody.details)).toBe(true);
});

test('PATCH /applications/:id should reject invalid relationship', async () => {
  const id = await createValidApplication();
  const response = await patch(`${url}/applications/${id}`, {
    additionalDrivers: {
      DRIVER1: {
        firstName: 'Additional',
        lastName: 'Driver',
        dateOfBirth: minAge18DateStr,
        gender: 'male',
        relationship: 'friend', // Invalid relationship
      },
    },
  });
  expect(response.status).toBe(400);
  const errorBody = await response.json();
  expect(errorBody.error).toBe('Validation error');
  expect(errorBody.message).toContain('Relationship must be one of');
  expect(errorBody.message).toContain('relationship');
  expect(errorBody.details).toBeDefined();
  expect(Array.isArray(errorBody.details)).toBe(true);
});

test('PATCH /applications/:id should reject more than 3 vehicles', async () => {
  const id = await createValidApplication();
  const response = await patch(`${url}/applications/${id}`, {
    vehicles: {
      V1: { make: 'Toyota', model: 'Corolla', year: 2010, vin: 'SHSRD78833U127404' },
      V2: { make: 'Honda', model: 'Civic', year: 2012, vin: '1HGFA16588L000000' },
      V3: { make: 'Ford', model: 'Focus', year: 2015, vin: '1FAHP3F20CL123456' },
      V4: { make: 'Chevy', model: 'Malibu', year: 2018, vin: '1G1ZD5ST0JF123456' }, // 4th vehicle
    },
  });
  expect(response.status).toBe(400);
  const errorBody = await response.json();
  expect(errorBody.error).toBe('Validation error');
  expect(errorBody.message).toContain('vehicles');
  expect(errorBody.details).toBeDefined();
  expect(Array.isArray(errorBody.details)).toBe(true);
});

test('PATCH /applications/:id should reject more than 3 additional drivers', async () => {
  const id = await createValidApplication();
  const minAge16Date = new Date();
  minAge16Date.setFullYear(minAge16Date.getFullYear() - 16);
  const minAge16DateStr = minAge16Date.toISOString().split('T')[0]!;
  const response = await patch(`${url}/applications/${id}`, {
    additionalDrivers: {
      D1: {
        firstName: 'Driver',
        lastName: 'One',
        dateOfBirth: minAge16DateStr,
        gender: 'male',
        relationship: 'child',
      },
      D2: {
        firstName: 'Driver',
        lastName: 'Two',
        dateOfBirth: minAge16DateStr,
        gender: 'female',
        relationship: 'child',
      },
      D3: {
        firstName: 'Driver',
        lastName: 'Three',
        dateOfBirth: minAge16DateStr,
        gender: 'male',
        relationship: 'child',
      },
      D4: {
        firstName: 'Driver',
        lastName: 'Four',
        dateOfBirth: minAge16DateStr,
        gender: 'female',
        relationship: 'child',
      }, // 4th driver
    },
  });
  expect(response.status).toBe(400);
  const errorBody = await response.json();
  expect(errorBody.error).toBe('Validation error');
  expect(errorBody.message).toContain('additionalDrivers');
  expect(errorBody.details).toBeDefined();
  expect(Array.isArray(errorBody.details)).toBe(true);
});
