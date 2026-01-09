#!/usr/bin/env node
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { Pool } = require('pg');

const DATABASE_URL = "postgresql://statusadmin:qf577.hzsOl23RtuyjzWdfdoYmxA34nrQb@status-tracker-db.c2pcsyw2k6q5.us-east-1.rds.amazonaws.com:5432/status_tracker";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// All timecard files to scan
const files = [
  '/Users/robertalward/Downloads/2025-08-01 - 2025-08-15 Timecard Export.csv',
  '/Users/robertalward/Downloads/2025-08-16 - 2025-08-31 Timecard Export.csv',
  '/Users/robertalward/Downloads/2025-09-01 - 2025-09-15 Timecard Export.csv',
  '/Users/robertalward/Downloads/2025-09-16 - 2025-09-30 Timecard Export.csv',
  '/Users/robertalward/Downloads/2025-10-01 - 2025-10-15 Timecard Export.csv',
  '/Users/robertalward/Downloads/2025-10-16 - 2025-10-31 Timecard Export.csv',
  '/Users/robertalward/Downloads/2025-11-01 - 2025-11-15 Timecard Export.csv',
  '/Users/robertalward/Downloads/2025-11-16 - 2025-11-30 Timecard Export.csv',
  '/Users/robertalward/Downloads/2025-12-01 - 2025-12-15 Timecard Export (1).csv',
  '/Users/robertalward/Downloads/2025-12-16 - 2025-12-31 Timecard Export (2).csv',
  '/Users/robertalward/Downloads/2026-01-01 - 2026-01-15 Timecard Export (1).csv',
];

async function main() {
  // Get existing expert names
  const result = await pool.query('SELECT LOWER(name) as name FROM experts WHERE is_active = true');
  const existingNames = new Set(result.rows.map(r => r.name));

  const allNames = new Set();
  const nameHours = new Map();

  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.log('File not found:', file);
      continue;
    }
    const content = fs.readFileSync(file, 'utf-8');
    const records = parse(content, { columns: true, skip_empty_lines: true });

    for (const row of records) {
      const name = row['Employee'];
      const hours = parseFloat(row['Hours - Regular']) || 0;
      if (name && hours > 0) {
        allNames.add(name);
        nameHours.set(name, (nameHours.get(name) || 0) + hours);
      }
    }
  }

  // Find new names not in experts table
  const newNames = [];
  const knownNames = [];

  for (const name of allNames) {
    if (existingNames.has(name.toLowerCase())) {
      knownNames.push(name);
    } else {
      newNames.push(name);
    }
  }

  console.log('='.repeat(60));
  console.log('TIMECARD NAME ANALYSIS');
  console.log('='.repeat(60));

  console.log('\n✅ KNOWN EXPERTS (' + knownNames.length + '):');
  knownNames.sort().forEach(name => {
    console.log('   ' + name + ' (' + nameHours.get(name).toFixed(1) + ' hrs)');
  });

  console.log('\n⚠️  NEW NAMES NOT IN EXPERTS TABLE (' + newNames.length + '):');
  newNames.sort((a,b) => nameHours.get(b) - nameHours.get(a)).forEach(name => {
    console.log('   ' + name + ' (' + nameHours.get(name).toFixed(1) + ' hrs)');
  });

  await pool.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
