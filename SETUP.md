# Setup and Running Guide

This guide explains how to set up and run the Hugo Backend API server.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

## Installation

```bash
npm install
```

## Environment Setup

### Development Environment

Create a `.env` file in the root directory with the following variables:

```env
PORT=3000
DB_PATH=./applications.db
```

### Test Environment

Create a `.env.test` file for running tests:

```env
NODE_ENV=test
PORT=3001
TEST_DB_PATH=./test.db
```

## Database Setup

### Run Migrations

Run migrations to set up the database schema:

```bash
npm run migrate
```

This will create the `applications` table and any necessary indexes.

### Rollback Migrations

To rollback a specific migration:

```bash
npm run rollback <migration-name>
```

Example:
```bash
npm run rollback 001_create_applications_table.ts
```

## Running the Server

### Development Mode (with hot reload)

Start the server with automatic restart on file changes:

```bash
npm run dev
```

The server will start on port 3000 (or the port specified in your `.env` file) and automatically restart when you make changes to the code.

### Production Mode

Start the server in production mode:

```bash
npm start
```

### Test Server

To run the server in test mode (uses test database and port 3001):

```bash
npm run test:server
```

The server will start on port 3001 and use the test database (`test.db`).

## Running Tests

### Run All Tests

The test script will automatically start the test server, run all tests, and clean up:

```bash
npm test
```

This will:
1. Start the test server on port 3001
2. Run all test suites
3. Stop the test server when tests complete

### Run Tests in Watch Mode

Run tests in watch mode for continuous testing during development:

```bash
npm test -- --watch
```

## Code Quality

### Formatting

Format all code using Prettier:

```bash
# Format all code
npm run format

# Check formatting without making changes
npm run format:check
```

### Linting

Run ESLint to check code quality:

```bash
# Run linter
npm run lint

# Fix linting issues automatically
npm run lint:fix
```

## Project Structure

```
.
├── src/
│   ├── controllers/       # Business logic and validation
│   │   ├── applications.ts
│   │   ├── schemas/        # Zod validation schemas
│   │   └── types.ts        # Controller types
│   ├── errors/            # Custom error classes
│   ├── middleware/        # Koa middleware (error handling)
│   ├── models/            # Database operations
│   │   ├── application.ts
│   │   ├── db.ts          # Database connection management
│   │   └── types.ts        # Model types
│   ├── router/            # API route definitions
│   │   └── applications.ts
│   └── index.ts           # Application entry point
├── scripts/               # Database migrations
│   ├── migrate.ts
│   ├── rollback.ts
│   └── 001_create_applications_table.ts
├── test/                  # Test files
│   ├── applications/     # Application API tests
│   ├── setup.ts          # Test setup (database cleanup)
│   └── test-utils.ts     # Test utilities
└── package.json
```

## API Endpoints

### POST /applications
Creates a new application with optional partial data.

**Request Body:**
```json
{
  "primaryDriver": {
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-01-01",
    "gender": "male",
    "maritalStatus": "single",
    "driversLicense": {
      "number": "ABC123456",
      "state": "CA"
    }
  },
  "mailingAddress": {
    "street": "123 Main St",
    "unit": "Apt 4",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90001"
  },
  "garagingAddress": {
    "street": "123 Main St",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90001"
  },
  "vehicles": {
    "VEH1": {
      "make": "Toyota",
      "model": "Camry",
      "year": 2020,
      "vin": "4T1B11HK5JU123456"
    }
  },
  "additionalDrivers": {
    "DRIVER1": {
      "firstName": "Jane",
      "lastName": "Doe",
      "dateOfBirth": "1995-05-15",
      "gender": "female",
      "relationship": "spouse"
    }
  }
}
```

**Response:** `200 OK` with application ID

### GET /applications/:id
Retrieves an application by ID. Returns validation errors if incomplete, or a quote price if valid.

**Response:** `200 OK` with application data, validation errors (if incomplete), or quote price (if valid)

### PATCH /applications/:id
Updates an existing application with partial data. Merges the provided data into the existing application.

**Request Body:** Partial application data (same structure as POST)

**Response:** `200 OK` with updated application data

### DELETE /applications/:id/data
Deletes specific data from an application using a dot-separated path.

**Request Body:**
```json
{
  "path": "primaryDriver.dateOfBirth"
}
```

**Response:** `200 OK` if successful, `403 Forbidden` if application is already submitted

### POST /applications/:id/submit
Submits a completed application and returns a quote price.

**Response:** `200 OK` with quote price, or `400 Bad Request` with validation errors if incomplete

## Troubleshooting

### Database Connection Issues

If you encounter database locking or connection errors:

1. Make sure no other server instances are running
2. Close any database viewers or tools accessing the database
3. Restart the server

### Port Already in Use

If you get a "port already in use" error:

1. Check if another process is using the port: `lsof -i :3000` (or your port)
2. Kill the process or change the port in your `.env` file

### Test Failures

If tests are failing:

1. Make sure the test database is properly set up
2. Check that migrations have been run: `npm run migrate` (with `NODE_ENV=test`)
3. Ensure the test server is running on the correct port (3001)

