import { google } from 'googleapis';
import { SheetData, StatusRow, ExpertSheetData, ExpertRow, CombinedData } from '@/types/status';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

function getGoogleSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Google Sheets credentials not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in .env.local');
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: SCOPES,
  });

  return google.sheets({ version: 'v4', auth });
}

function parseSheetData(values: any[][], sheetName: string): SheetData {
  if (!values || values.length < 2) {
    return { name: sheetName, rows: [], grandTotal: 0 };
  }

  // Get column indices from headers
  const headers = values[0];
  const weekIndex = headers.findIndex((h: string) => h === 'Week');
  const statusIndex = headers.findIndex((h: string) => h === 'Status');

  if (weekIndex === -1 || statusIndex === -1) {
    console.error('Could not find Week or Status columns in sheet:', sheetName);
    return { name: sheetName, rows: [], grandTotal: 0 };
  }

  // Create a map to aggregate: { status: { week1: count, week2: count, ... } }
  const aggregation = new Map<string, { [key: string]: number }>();

  // Skip header row (index 0), start from row 1
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row || row.length === 0) continue;

    const status = row[statusIndex]?.toString().trim() || 'Not Set';
    const weekStr = row[weekIndex]?.toString().trim();

    // Parse week number - if missing or invalid, use 'NA' week
    let weekKey = 'weekNA';
    if (weekStr) {
      const weekNum = parseInt(weekStr, 10);
      if (!isNaN(weekNum) && weekNum >= 1 && weekNum <= 7) {
        weekKey = `week${weekNum}`;
      }
    }

    // Initialize status entry if it doesn't exist
    if (!aggregation.has(status)) {
      aggregation.set(status, {
        week1: 0,
        week2: 0,
        week3: 0,
        week4: 0,
        week5: 0,
        week6: 0,
        week7: 0,
        weekNA: 0,
      });
    }

    // Increment the count for this status and week
    const statusData = aggregation.get(status)!;
    statusData[weekKey] = (statusData[weekKey] || 0) + 1;
  }

  // Convert aggregation map to StatusRow array
  const rows: StatusRow[] = [];
  let grandTotal = 0;

  aggregation.forEach((weekCounts, status) => {
    const total =
      weekCounts.week1 +
      weekCounts.week2 +
      weekCounts.week3 +
      weekCounts.week4 +
      weekCounts.week5 +
      weekCounts.week6 +
      weekCounts.week7 +
      (weekCounts.weekNA || 0);

    rows.push({
      status,
      week1: weekCounts.week1,
      week2: weekCounts.week2,
      week3: weekCounts.week3,
      week4: weekCounts.week4,
      week5: weekCounts.week5,
      week6: weekCounts.week6,
      week7: weekCounts.week7,
      weekNA: weekCounts.weekNA || 0,
      total,
    });

    grandTotal += total;
  });

  // Sort rows by status name
  rows.sort((a, b) => a.status.localeCompare(b.status));

  return { name: sheetName, rows, grandTotal };
}

function parseExpertData(values: any[][], sheetName: string): ExpertSheetData {
  if (!values || values.length < 2) {
    return { name: sheetName, rows: [], grandTotal: 0 };
  }

  // Get column indices from headers
  const headers = values[0];
  const weekIndex = headers.findIndex((h: string) => h === 'Week');
  const smeIndex = headers.findIndex((h: string) => h === 'SME');
  const idIndex = headers.findIndex((h: string) => h === 'ID');
  const specIndex = headers.findIndex((h: string) => h === 'Spec #' || h === 'Spec');

  if (weekIndex === -1 || smeIndex === -1) {
    console.error('Could not find Week or SME columns in sheet:', sheetName);
    return { name: sheetName, rows: [], grandTotal: 0 };
  }

  // Track which problems we've already counted for each SME to avoid double-counting
  const seenProblems = new Map<string, Set<string>>(); // SME -> Set of problem IDs

  // Create a map to aggregate: { expert: { week1: count, week2: count, ... } }
  const aggregation = new Map<string, { [key: string]: number }>();

  // Skip header row (index 0), start from row 1
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row || row.length < Math.max(weekIndex, smeIndex) + 1) continue;

    // Get problem identifier (use ID or Spec #, preferring ID if available)
    const problemId = (idIndex !== -1 ? row[idIndex]?.toString().trim() : '') ||
                      (specIndex !== -1 ? row[specIndex]?.toString().trim() : '');
    if (!problemId) continue;

    const weekStr = row[weekIndex]?.toString().trim();

    // Parse week number - if missing or invalid, use 'NA' week
    let weekKey = 'weekNA';
    if (weekStr) {
      const weekNum = parseInt(weekStr, 10);
      if (!isNaN(weekNum) && weekNum >= 1 && weekNum <= 7) {
        weekKey = `week${weekNum}`;
      }
    }

    // Get only the SME (Subject Matter Expert)
    const sme = row[smeIndex]?.toString().trim();

    if (!sme || sme.length === 0) continue;

    // Check if we've already counted this problem for this SME
    if (!seenProblems.has(sme)) {
      seenProblems.set(sme, new Set());
    }

    const smeProblems = seenProblems.get(sme)!;
    if (smeProblems.has(problemId)) {
      // Skip - we've already counted this problem for this SME
      continue;
    }

    // Mark this problem as seen for this SME
    smeProblems.add(problemId);

    // Initialize SME entry if it doesn't exist
    if (!aggregation.has(sme)) {
      aggregation.set(sme, {
        week1: 0,
        week2: 0,
        week3: 0,
        week4: 0,
        week5: 0,
        week6: 0,
        week7: 0,
        weekNA: 0,
      });
    }

    // Increment the count for this SME and week
    const expertData = aggregation.get(sme)!;
    expertData[weekKey] = (expertData[weekKey] || 0) + 1;
  }

  // Convert aggregation map to ExpertRow array
  const rows: ExpertRow[] = [];
  let grandTotal = 0;

  aggregation.forEach((weekCounts, expert) => {
    const total =
      weekCounts.week1 +
      weekCounts.week2 +
      weekCounts.week3 +
      weekCounts.week4 +
      weekCounts.week5 +
      weekCounts.week6 +
      weekCounts.week7 +
      (weekCounts.weekNA || 0);

    rows.push({
      expert,
      week1: weekCounts.week1,
      week2: weekCounts.week2,
      week3: weekCounts.week3,
      week4: weekCounts.week4,
      week5: weekCounts.week5,
      week6: weekCounts.week6,
      week7: weekCounts.week7,
      weekNA: weekCounts.weekNA || 0,
      total,
    });

    grandTotal += total;
  });

  // Sort rows by expert name
  rows.sort((a, b) => a.expert.localeCompare(b.expert));

  return { name: sheetName, rows, grandTotal };
}

export async function fetchSheetData(spreadsheetId: string, range: string, sheetName: string): Promise<SheetData> {
  const sheets = getGoogleSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const values = response.data.values;
  if (!values) {
    return { name: sheetName, rows: [], grandTotal: 0 };
  }

  return parseSheetData(values, sheetName);
}

export async function fetchExpertData(spreadsheetId: string, range: string, sheetName: string): Promise<ExpertSheetData> {
  const sheets = getGoogleSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const values = response.data.values;
  if (!values) {
    return { name: sheetName, rows: [], grandTotal: 0 };
  }

  return parseExpertData(values, sheetName);
}

export async function fetchAllSheets(): Promise<{ sheets: SheetData[], expertSheets: ExpertSheetData[] }> {
  const peSheetId = process.env.GOOGLE_SHEET_ID_PE;
  const ibSheetId = process.env.GOOGLE_SHEET_ID_IB;

  if (!peSheetId || !ibSheetId) {
    throw new Error('Google Sheet IDs not configured. Please set GOOGLE_SHEET_ID_PE and GOOGLE_SHEET_ID_IB in .env.local');
  }

  // Fetch both status and expert data in parallel - increased range to 500 rows to get all data
  const [peData, ibData, peExpertData, ibExpertData] = await Promise.all([
    fetchSheetData(peSheetId, 'A1:I500', 'PE'),
    fetchSheetData(ibSheetId, 'A1:I500', 'IB'),
    fetchExpertData(peSheetId, 'A1:I500', 'PE'),
    fetchExpertData(ibSheetId, 'A1:I500', 'IB'),
  ]);

  return {
    sheets: [peData, ibData],
    expertSheets: [peExpertData, ibExpertData],
  };
}
