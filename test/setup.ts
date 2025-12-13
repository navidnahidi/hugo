import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load test environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';
