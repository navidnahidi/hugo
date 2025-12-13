import dotenv from 'dotenv';
import { expect, test } from 'vitest';

dotenv.config();

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
});
