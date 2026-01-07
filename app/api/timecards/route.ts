import { NextResponse } from 'next/server';
import {
  upsertTimecard,
  getLatestTimecards,
  getTimecardsByPeriod,
  getTimecardPeriods,
  startSyncRun,
  completeSyncRun,
  logSyncError,
  upsertExpertFromRippling,
} from '@/lib/db/operations';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');

    let timecards;
    if (periodStart && periodEnd) {
      timecards = await getTimecardsByPeriod(new Date(periodStart), new Date(periodEnd));
    } else {
      timecards = await getLatestTimecards();
    }

    const periods = await getTimecardPeriods();

    // Calculate totals
    const totals = timecards.reduce(
      (acc, tc) => ({
        totalHours: acc.totalHours + Number(tc.hoursRegular),
        approvedHours: acc.approvedHours + Number(tc.hoursApproved),
        pendingCount: acc.pendingCount + (tc.status === 'Pending approval' ? 1 : 0),
        approvedCount: acc.approvedCount + (tc.status === 'Approved' ? 1 : 0),
        noHoursCount: acc.noHoursCount + (tc.status === 'No hours' ? 1 : 0),
      }),
      { totalHours: 0, approvedHours: 0, pendingCount: 0, approvedCount: 0, noHoursCount: 0 }
    );

    return NextResponse.json({
      timecards,
      periods,
      totals,
      currentPeriod: timecards.length > 0
        ? { periodStart: timecards[0].periodStart, periodEnd: timecards[0].periodEnd }
        : null,
    });
  } catch (error) {
    console.error('Error fetching timecards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timecards', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const syncRunId = await startSyncRun('rippling_csv');
  let processed = 0;
  let created = 0;
  let updated = 0;
  let errors = 0;

  try {
    const body = await request.json();
    const { csvData, periodStart, periodEnd } = body;

    if (!csvData || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'Missing required fields: csvData, periodStart, periodEnd' },
        { status: 400 }
      );
    }

    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    // Parse CSV data (expecting array of rows)
    const rows = Array.isArray(csvData) ? csvData : [];

    for (const row of rows) {
      processed++;
      try {
        const employeeName = row['Employee'] || row['employeeName'];

        // Auto-create expert from Rippling employee if doesn't exist
        if (employeeName) {
          await upsertExpertFromRippling(employeeName);
        }

        // Parse "Approved/Total" column (format: "X / Y" or "X.XX / Y.YY")
        let hoursApproved = 0;
        let hoursTotal = 0;
        if (row['Approved/Total']) {
          const parts = row['Approved/Total'].split('/').map((s: string) => s.trim());
          hoursApproved = parseFloat(parts[0]) || 0;
          hoursTotal = parseFloat(parts[1]) || 0;
        }

        await upsertTimecard({
          employeeName,
          periodStart: startDate,
          periodEnd: endDate,
          status: row['Status'] || row['status'] || 'Unknown',
          hoursRegular: parseFloat(row['Hours - Regular'] || row['hoursRegular']) || 0,
          hoursApproved,
          hoursTotal,
          alerts: parseInt(row['Alerts'] || row['alerts']) || 0,
          timeOffPtoPaid: parseFloat(row['Time Off - PTO (Paid)'] || row['timeOffPtoPaid']) || 0,
          timeOffPtoUnpaid: parseFloat(row['Time Off - PTO (Unpaid)'] || row['timeOffPtoUnpaid']) || 0,
          holidaysPaid: parseFloat(row['Holidays (Paid)'] || row['holidaysPaid']) || 0,
        });
        created++;
      } catch (err) {
        errors++;
        await logSyncError(
          syncRunId,
          'parse',
          'error',
          `Failed to process row for ${row['Employee'] || 'unknown'}: ${String(err)}`,
          row
        );
      }
    }

    await completeSyncRun(syncRunId, errors > 0 ? 'partial' : 'success', {
      processed,
      created,
      updated,
      errors,
    });

    return NextResponse.json({
      success: true,
      syncRunId,
      stats: { processed, created, updated, errors },
    });
  } catch (error) {
    console.error('Error uploading timecards:', error);
    await completeSyncRun(syncRunId, 'failed', { processed, created, updated, errors });
    return NextResponse.json(
      { error: 'Failed to upload timecards', details: String(error) },
      { status: 500 }
    );
  }
}
