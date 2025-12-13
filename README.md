# Hugo Backend Take Home Challenge

Create an API that allows for customers to create, update, and submit an application to get a quote
for auto insurance. The API should fulfill the requirements outlined below at a minimum. There is a
sample test runner that checks for basic functionality. You are encouraged to add additional tests
as you see fit to ensure that all of the requirements are met.

## Goals

- Complete server implementation of the API definition
- Tests to prove that the API meets the requirements
- Data should be stored in a database
    - SQLite is preferred
- Language choice is up to you
    - It is recommended to use TypeScript, but if you are more comfortable with another language,
      feel free to use that.
- Include documentation somewhere that calls out:
    - Instructions on how to run the server
    - Specific assumptions about the requirements that influenced your implementation.
    - Changes/additions you made to the API spec.
    - Things you would do differently or improve upon if you had more time.

## Test Runner

To use the included test runner, you will need Node.js installed. Then you can run

```bash
# NOTE: your server will need to be running already for the provided test runner to work
npm install
npm test
```

The provided test case will go through a "happy path" scenario that hits the documented routes and
ensures a `200` response is returned.

Your submission should include additional test cases that show the API meets the requirements
outlined below.

## Data Requirements

The following represents the high level items that must be collected for a completed quote
application

All fields are required unless otherwise noted, must adhere to the data validation requirements, and
the types must be enforced.

### Primary Driver

- First Name
- Last Name
- Date of Birth
    - Must be a valid date, but must not be a timestamp (it must be `YYYY-MM-DD`)
    - Must be at least 18 years old
- Gender
    - Valid values are `male`, `female`, `non-binary`
- Marital Status
    - Valid values are `single`, `married`, `divorced`, `widowed`
- Driver's License
    - Number
        - Must be 9 uppercase alphanumeric characters
    - State
        - Must be valid US state abbreviation

### Vehicles

The application must have at least 1 vehicle and must not have more than 3 vehicles.

- Make
- Model
- Year
    - Must be between 1985 and the current year + 1
- VIN
    - Must be 17 characters exactly
    - Restricted to `0-9` and `A-Z` except for `I`, `O`, `Q`
    - (OPTIONAL) As a stretch goal, validate the VIN using the
      [ISO 3779](https://en.wikipedia.org/wiki/Vehicle_identification_number#Check-digit_calculation)
      algorithm

### Mailing Address

- Street
- Unit
    - Optional field
- City
- State
    - Must be valid US state abbreviation
- Zip Code
    - Must be a 5 digit string

### Garaging Address

- Street
- City
- State
    - Must be valid US state abbreviation
- Zip Code
    - Must be a 5 digit string

### Additional Drivers

The application may have additional drivers and must not have more than 3 additional drivers.

- First Name
- Last Name
- Date of Birth
    - Must be a valid date, but must not be a timestamp (it must be `YYYY-MM-DD`)
    - Must be at least 16 years old
- Gender
    - Valid values are `male`, `female`, `non-binary`
- Relationship to Primary Driver
    - Must be one of the following values: `spouse`, `child`, `parent`, `sibling`, `other`

## API

The routes that the API should implement are outlined below. The following requirements are also
generally applicable unless otherwise noted:

- Use `PORT` environment variable for the port number to listen on (load via a `.env` file), with a
  fallback for `3000`
- Partial data can be stored, but never invalid data
    - For example, `dateOfBirth` can be missing while an application is being filled out, but it
      must always be a valid value
    - Invalid values must be rejected when submitted

### Schema Shape

The general shape of the application schema should look like the following. You are free to modify
this if needed, but you should document those changes as part of your submission.

```typescript
type Application = {
    primaryDriver: PrimaryDriver;
    mailingAddress: AddressWithUnit;
    garagingAddress: Address;
    vehicles: {
        [ID: string]: Vehicle;
    };
    additionalDrivers: {
        [ID: string]: AdditionalDriver;
    };
};
```

Note that `vehicles` and `additionalDrivers` are objects with an ID as the key (they are not
arrays).

### Routes

#### `POST /applications`

Initializes a new application. This should allow including some partial set of data to initialize
the new application.

#### `GET /applications/:id`

Returns the application data for the specified ID. Must also include a calculated price for the
quote _if_ the application is completely valid. Otherwise, should include list of validation errors
that need to be addressed to submit the application.

#### `PATCH /applications/:id`

Updates an existing application with updated data. The submitted data will be a partial subset of
the application schema, and should be merged into the existing application data. Updates should not
be allowed after an application has been submitted.

#### `DELETE /applications/:id/data`

Removes the specified data from the application using the path to the data. The path should consist
of the keys that target the data to be moved joined into a string with `.` as the separator.

As an example, the following would remove the `dateOfBirth` field from the primary driver

```json
{
    "path": "primaryDriver.dateOfBirth"
}
```

Or the following would remove the vehicle with ID `ABC123` from the application

```json
{
    "path": "vehicles.ABC123"
}
```

Deletions should not be allowed after an application has been submitted.

#### `POST /applications/:id/submit`

Submits a completed application, and returns a calculated price for the quote. For this exercise, a
random number can be returned.
