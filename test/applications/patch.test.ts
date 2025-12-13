import { expect, test } from 'vitest';
import { post, patch, get, url } from './test-utils';

test('should update an application with partial data', async () => {
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

  // Update with partial data
  response = await patch(`${url}/applications/${id}`, {
    primaryDriver: {
      gender: 'male',
      maritalStatus: 'single',
    },
  });

  expect(response.status).toBe(200);
  body = await response.json();
  expect(body.id).toBe(id);
  expect(body.message).toBe('Application updated successfully');

  // Verify the update by getting the application
  response = await get(`${url}/applications/${id}`);
  expect(response.status).toBe(200);
  body = await response.json();
  expect(body.primaryDriver?.gender).toBe('male');
  expect(body.primaryDriver?.maritalStatus).toBe('single');
  expect(body.primaryDriver?.firstName).toBe('Test'); // Original data should still be there
});

test('should merge partial updates into existing data', async () => {
  // Create an application with some initial data
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

  // Update with additional fields
  response = await patch(`${url}/applications/${id}`, {
    primaryDriver: {
      maritalStatus: 'single',
      driversLicense: {
        number: 'ABC123456',
        state: 'CA',
      },
    },
  });

  expect(response.status).toBe(200);

  // Verify all data is merged correctly
  response = await get(`${url}/applications/${id}`);
  expect(response.status).toBe(200);
  body = await response.json();
  expect(body.primaryDriver?.firstName).toBe('Test');
  expect(body.primaryDriver?.lastName).toBe('User');
  expect(body.primaryDriver?.dateOfBirth).toBe('1980-06-01');
  expect(body.primaryDriver?.gender).toBe('male');
  expect(body.primaryDriver?.maritalStatus).toBe('single');
  expect(body.primaryDriver?.driversLicense?.number).toBe('ABC123456');
  expect(body.primaryDriver?.driversLicense?.state).toBe('CA');
});

test('should update mailing address', async () => {
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

  // Update with mailing address
  response = await patch(`${url}/applications/${id}`, {
    mailingAddress: {
      street: '123 Test St',
      city: 'Testville',
      state: 'CA',
      zip: '12345',
    },
  });

  expect(response.status).toBe(200);

  // Verify the update
  response = await get(`${url}/applications/${id}`);
  expect(response.status).toBe(200);
  body = await response.json();
  expect(body.mailingAddress?.street).toBe('123 Test St');
  expect(body.mailingAddress?.city).toBe('Testville');
  expect(body.mailingAddress?.state).toBe('CA');
  expect(body.mailingAddress?.zip).toBe('12345');
});

test('should update vehicles', async () => {
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

  // Update with vehicles
  response = await patch(`${url}/applications/${id}`, {
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

  // Verify the update
  response = await get(`${url}/applications/${id}`);
  expect(response.status).toBe(200);
  body = await response.json();
  expect(body.vehicles?.ABC123).toBeDefined();
  expect(body.vehicles?.ABC123?.make).toBe('Toyota');
  expect(body.vehicles?.ABC123?.model).toBe('Corolla');
  expect(body.vehicles?.ABC123?.year).toBe(2010);
  expect(body.vehicles?.ABC123?.vin).toBe('SHSRD78833U127404');
});

test('should update multiple fields at once', async () => {
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

  // Update with multiple fields
  response = await patch(`${url}/applications/${id}`, {
    primaryDriver: {
      gender: 'female',
      maritalStatus: 'married',
    },
    mailingAddress: {
      street: '456 Main St',
      city: 'Springfield',
      state: 'NY',
      zip: '54321',
    },
    garagingAddress: {
      street: '789 Oak Ave',
      city: 'Riverside',
      state: 'TX',
      zip: '98765',
    },
  });

  expect(response.status).toBe(200);

  // Verify all updates
  response = await get(`${url}/applications/${id}`);
  expect(response.status).toBe(200);
  body = await response.json();
  expect(body.primaryDriver?.gender).toBe('female');
  expect(body.primaryDriver?.maritalStatus).toBe('married');
  expect(body.mailingAddress?.city).toBe('Springfield');
  expect(body.garagingAddress?.city).toBe('Riverside');
});

test('should not allow updating a submitted application', async () => {
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

  // Try to update the submitted application
  response = await patch(`${url}/applications/${id}`, {
    primaryDriver: {
      gender: 'female',
    },
  });

  // Should return 403 Forbidden
  expect(response.status).toBe(403);
  body = await response.json();
  expect(body.error).toBe('Forbidden');
  expect(body.message).toBe('Cannot update a submitted application');
});

test('should return 404 when updating non-existent application', async () => {
  // Try to update an application that doesn't exist
  const response = await patch(`${url}/applications/non-existent-id`, {
    primaryDriver: {
      gender: 'male',
    },
  });

  // Should return 404 Not Found
  expect(response.status).toBe(404);
  const body = await response.json();
  expect(body.error).toBe('Not found');
  expect(body.message).toContain('not found');
});

test('should update additional drivers', async () => {
  const minAge16Date = new Date();
  minAge16Date.setFullYear(minAge16Date.getFullYear() - 16);
  const minAge16DateStr = minAge16Date.toISOString().split('T')[0]!;

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

  // Update with additional drivers
  response = await patch(`${url}/applications/${id}`, {
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

  expect(response.status).toBe(200);

  // Verify the update
  response = await get(`${url}/applications/${id}`);
  expect(response.status).toBe(200);
  body = await response.json();
  expect(body.additionalDrivers?.DRIVER1).toBeDefined();
  expect(body.additionalDrivers?.DRIVER1?.firstName).toBe('Additional');
  expect(body.additionalDrivers?.DRIVER1?.relationship).toBe('child');
});

test('should overwrite existing fields when updating', async () => {
  // Create an application with initial data
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

  // Update to change existing fields
  response = await patch(`${url}/applications/${id}`, {
    primaryDriver: {
      gender: 'female',
      maritalStatus: 'married',
    },
  });

  expect(response.status).toBe(200);

  // Verify fields were overwritten
  response = await get(`${url}/applications/${id}`);
  expect(response.status).toBe(200);
  body = await response.json();
  expect(body.primaryDriver?.gender).toBe('female');
  expect(body.primaryDriver?.maritalStatus).toBe('married');
  expect(body.primaryDriver?.firstName).toBe('Test'); // Other fields should remain
});

test('should validate data when updating', async () => {
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

  // Try to update with invalid data
  response = await patch(`${url}/applications/${id}`, {
    primaryDriver: {
      gender: 'invalid-gender',
    },
  });

  // Should return 400 with validation error
  expect(response.status).toBe(400);
  body = await response.json();
  expect(body.error).toBe('Validation error');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});
