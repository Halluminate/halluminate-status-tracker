import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';

// PostgreSQL connection pool
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Determine SSL config based on environment
    // For Vercel/production, we need SSL but can't verify RDS self-signed certs
    const sslConfig = process.env.VERCEL || process.env.NODE_ENV === 'production'
      ? {
          rejectUnauthorized: false,
          // Don't require specific cert - RDS uses Amazon's root CA
        }
      : false;

    pool = new Pool({
      connectionString,
      ssl: sslConfig,
      max: 5, // Lower for serverless
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error:', err);
    });
  }

  return pool;
}

// Get a client from the pool
export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return pool.connect();
}

// Execute a query
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rows as T[];
}

// Execute a query and return first row
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

// Initialize the database schema
export async function initializeSchema(): Promise<void> {
  const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql');

  if (!fs.existsSync(schemaPath)) {
    console.warn('Schema file not found at:', schemaPath);
    return;
  }

  const schema = fs.readFileSync(schemaPath, 'utf-8');
  const pool = getPool();

  try {
    await pool.query(schema);
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing schema:', error);
    throw error;
  }
}

// Transaction helper
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Close the pool
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Health check
export async function healthCheck(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
