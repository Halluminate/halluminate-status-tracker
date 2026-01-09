#!/usr/bin/env node
/**
 * Bulk import Rippling timecard CSVs into PostgreSQL
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { Pool } = require('pg');

const DATABASE_URL = "postgresql://statusadmin:qf577.hzsOl23RtuyjzWdfdoYmxA34nrQb@status-tracker-db.c2pcsyw2k6q5.us-east-1.rds.amazonaws.com:5432/status_tracker";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Name mappings (Rippling name -> Expert name)
const NAME_MAPPINGS = {
  'Z L': 'Zach Barry',
  'Philip Garbarini': 'Phil Garbarini',
};

// Timecard files to import (in chronological order)
const TIMECARD_FILES = [
  { file: '2025-08-01 - 2025-08-15 Timecard Export.csv', periodStart: '2025-08-01', periodEnd: '2025-08-15' },
  { file: '2025-08-16 - 2025-08-31 Timecard Export.csv', periodStart: '2025-08-16', periodEnd: '2025-08-31' },
  { file: '2025-09-01 - 2025-09-15 Timecard Export.csv', periodStart: '2025-09-01', periodEnd: '2025-09-15' },
  { file: '2025-09-16 - 2025-09-30 Timecard Export.csv', periodStart: '2025-09-16', periodEnd: '2025-09-30' },
  { file: '2025-10-01 - 2025-10-15 Timecard Export.csv', periodStart: '2025-10-01', periodEnd: '2025-10-15' },
  { file: '2025-10-16 - 2025-10-31 Timecard Export.csv', periodStart: '2025-10-16', periodEnd: '2025-10-31' },
  { file: '2025-11-01 - 2025-11-15 Timecard Export.csv', periodStart: '2025-11-01', periodEnd: '2025-11-15' },
  { file: '2025-11-16 - 2025-11-30 Timecard Export.csv', periodStart: '2025-11-16', periodEnd: '2025-11-30' },
  { file: '2025-12-01 - 2025-12-15 Timecard Export (1).csv', periodStart: '2025-12-01', periodEnd: '2025-12-15' },
  { file: '2025-12-16 - 2025-12-31 Timecard Export (2).csv', periodStart: '2025-12-16', periodEnd: '2025-12-31' },
  { file: '2026-01-01 - 2026-01-15 Timecard Export (1).csv', periodStart: '2026-01-01', periodEnd: '2026-01-15' },
];

const DOWNLOADS_DIR = '/Users/robertalward/Downloads';

async function getExpertIdByName(name) {
  // Apply name mapping
  const mappedName = NAME_MAPPINGS[name] || name;

  const result = await pool.query(
    'SELECT id FROM experts WHERE LOWER(name) = LOWER($1) AND is_active = true',
    [mappedName]
  );
  return result.rows[0]?.id || null;
}

async function upsertTimecard(timecard) {
  // Apply name mapping for storage
  const mappedName = NAME_MAPPINGS[timecard.employeeName] || timecard.employeeName;
  const expertId = await getExpertIdByName(timecard.employeeName);

  await pool.query(`
    INSERT INTO timecards (
      expert_id, employee_name, period_start, period_end,
      status, hours_regular, hours_approved, hours_total, alerts,
      time_off_pto_paid, time_off_pto_unpaid, holidays_paid
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (employee_name, period_start, period_end) DO UPDATE SET
      expert_id = COALESCE($1, timecards.expert_id),
      status = $5,
      hours_regular = $6,
      hours_approved = $7,
      hours_total = $8,
      alerts = $9,
      time_off_pto_paid = $10,
      time_off_pto_unpaid = $11,
      holidays_paid = $12,
      updated_at = NOW()
  `, [
    expertId,
    mappedName,  // Store with mapped name
    timecard.periodStart,
    timecard.periodEnd,
    timecard.status,
    timecard.hoursRegular,
    timecard.hoursApproved,
    timecard.hoursTotal,
    timecard.alerts || 0,
    timecard.timeOffPtoPaid || 0,
    timecard.timeOffPtoUnpaid || 0,
    timecard.holidaysPaid || 0,
  ]);

  return { expertId, mappedName };
}

async function importFile(fileInfo) {
  const filePath = path.join(DOWNLOADS_DIR, fileInfo.file);

  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found: ${fileInfo.file}`);
    return { imported: 0, skipped: 0, linked: 0 };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parse(content, { columns: true, skip_empty_lines: true });

  let imported = 0;
  let skipped = 0;
  let linked = 0;

  for (const row of records) {
    const employeeName = row['Employee'];
    const hoursRegular = parseFloat(row['Hours - Regular']) || 0;

    // Skip rows with 0 hours
    if (hoursRegular === 0) {
      skipped++;
      continue;
    }

    // Parse "Approved/Total" column
    let hoursApproved = 0;
    let hoursTotal = 0;
    if (row['Approved/Total']) {
      const parts = row['Approved/Total'].split('/').map(s => s.trim());
      hoursApproved = parseFloat(parts[0]) || 0;
      hoursTotal = parseFloat(parts[1]) || 0;
    }

    // Combine submission and approval status
    const submissionStatus = row['Submission status'] || 'N/A';
    const approvalStatus = row['Approval status'] || 'N/A';
    const status = approvalStatus === 'Paid' ? 'Approved' :
                   approvalStatus === 'Pending' ? 'Pending approval' :
                   submissionStatus === 'Not submitted' ? 'Not submitted' : 'Unknown';

    const result = await upsertTimecard({
      employeeName,
      periodStart: fileInfo.periodStart,
      periodEnd: fileInfo.periodEnd,
      status,
      hoursRegular,
      hoursApproved,
      hoursTotal,
      alerts: 0,
      timeOffPtoPaid: parseFloat(row['Time Off - PTO (Paid)']) || 0,
      timeOffPtoUnpaid: parseFloat(row['Time Off - PTO (Unpaid)']) || 0,
      holidaysPaid: parseFloat(row['Holidays (Paid)']) || 0,
    });

    imported++;
    if (result.expertId) linked++;
  }

  return { imported, skipped, linked };
}

async function main() {
  console.log('='.repeat(60));
  console.log('Rippling Timecard Import');
  console.log('='.repeat(60));

  // First, clear existing data to avoid duplicates with old file versions
  await pool.query('DELETE FROM timecards');
  console.log('\n🗑️  Cleared existing timecard data for fresh import\n');

  let totalImported = 0;
  let totalSkipped = 0;
  let totalLinked = 0;

  for (const fileInfo of TIMECARD_FILES) {
    console.log(`📁 ${fileInfo.file}`);
    console.log(`   Period: ${fileInfo.periodStart} to ${fileInfo.periodEnd}`);

    const { imported, skipped, linked } = await importFile(fileInfo);
    totalImported += imported;
    totalSkipped += skipped;
    totalLinked += linked;

    console.log(`   ✅ Imported: ${imported}, Linked to experts: ${linked}, Skipped: ${skipped}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`TOTAL: ${totalImported} timecards, ${totalLinked} linked to experts`);
  console.log('='.repeat(60));

  // Show summary by period
  const result = await pool.query(`
    SELECT
      period_start,
      period_end,
      COUNT(*) as employees,
      COUNT(expert_id) as linked,
      ROUND(SUM(hours_regular)::numeric, 2) as total_hours
    FROM timecards
    GROUP BY period_start, period_end
    ORDER BY period_start
  `);

  console.log('\n📊 Timecard Summary by Period:');
  console.log('─'.repeat(70));
  console.log('Period                    Employees  Linked   Hours');
  console.log('─'.repeat(70));

  let grandTotalHours = 0;
  for (const row of result.rows) {
    const start = row.period_start.toISOString().split('T')[0];
    const end = row.period_end.toISOString().split('T')[0];
    console.log(`${start} to ${end}      ${String(row.employees).padStart(3)}      ${String(row.linked).padStart(3)}    ${String(row.total_hours).padStart(8)}`);
    grandTotalHours += parseFloat(row.total_hours);
  }
  console.log('─'.repeat(70));
  console.log(`TOTAL                                        ${grandTotalHours.toFixed(2)} hrs`);

  await pool.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
