import { expect, test } from 'vitest';
import { del, post, patch, url } from './test-utils';

test('should be able to start, update, and submit an application', async () => {
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
