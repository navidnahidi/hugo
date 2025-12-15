import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
    },
    setupFiles: ['./test/setup.ts'],
  },
});
