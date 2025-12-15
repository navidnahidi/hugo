import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Explicitly set TEST_DB_PATH to ensure tests use test database
// This ensures the server (if running) also uses test.db when tests run
if (!process.env.TEST_DB_PATH) {
  process.env.TEST_DB_PATH = path.join(process.cwd(), 'test.db');
}
