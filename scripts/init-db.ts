#!/usr/bin/env npx ts-node

// Initialize the PostgreSQL database with schema
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

import { initializeSchema, healthCheck, closePool } from '../lib/db/postgres';

async function main() {
  console.log('Checking database connection...');

  const isHealthy = await healthCheck();
  if (!isHealthy) {
    console.error('Failed to connect to database. Check DATABASE_URL in .env.local');
    process.exit(1);
  }

  console.log('Connected to database successfully!');
  console.log('Initializing schema...');

  try {
    await initializeSchema();
    console.log('Schema initialized successfully!');
  } catch (error) {
    console.error('Error initializing schema:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
