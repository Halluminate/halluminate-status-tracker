import { google } from 'googleapis';
import { getExpertRate, type ProblemStatus } from '@/types/experts';
import {
  upsertExpert,
  upsertProblem,
  getExpertByName,
  getDb,
} from '@/lib/db';

// Name normalization map for matching across data sources
const NAME_ALIASES: Record<string, string> = {
  'Rob': 'Robert Alward',
  'Jerry': 'Jerry Wu',
  'Will': 'Will',
  'Wyatt': 'Wyatt',
  'Alex': 'Alex Ishin',
  'Zach': 'Zach Barry',
  'Josh': 'Josh Gelberger',
  'Kavi': 'Kavi Munjal',
  'Lindsay': 'Lindsay Saldebar',
  'Arielle': 'Arielle Flynn',
  'Frank': 'Frank Mork',
  'Phil': 'Philip Garbarini',
  'Philip': 'Philip Garbarini',
  'Jackson': 'Jackson Ozello',
  'Prem': 'Prem Patel',
  'Tyler': 'Tyler Patterson',
  'Haylee': 'Haylee Glenn',
  'Jack': 'Jack Barnett',
  'Gorka': 'Gorka',
  'Andrew': 'Andrew',
  'Andrew K': 'Andrew K',
  'Ryan': 'Ryan Diebner',
  'Minesh': 'Minesh Patel',
  'Sneh': 'Sneh Patel',
  'Jason': 'Jason Dotzel',
  'Z L': 'Zach Barry',
};

function normalizeName(name: string | undefined): string | undefined {
  if (!name || name.trim() === '') return undefined;
  const trimmed = name.trim();
  return NAME_ALIASES[trimmed] ?? trimmed;
}

function getOrCreateExpert(name: string | undefined): number | undefined {
  if (!name) return undefined;
  const normalized = normalizeName(name);
  if (!normalized) return undefined;

  let expert = getExpertByName(normalized);
  if (!expert) {
    expert = upsertExpert({
      name: normalized,
      hourlyRate: getExpertRate(normalized),
    });
  }
  return expert.id;
}

// Initialize Google Sheets API client
function getGoogleSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Google Sheets credentials not configured');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return google.sheets({ version: 'v4', auth });
}

// Fetch data from a Google Sheet
async function fetchSheetData(spreadsheetId: string, range: string): Promise<string[][]> {
  const sheets = getGoogleSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return (response.data.values as string[][]) || [];
}

// Sync PE Problems from Google Sheets
export async function syncPEProblems(): Promise<{ synced: number; errors: string[] }> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID_PE;
  if (!spreadsheetId) {
    return { synced: 0, errors: ['PE Sheet ID not configured'] };
  }

  // Initialize database
  getDb();

  const rows = await fetchSheetData(spreadsheetId, 'PE Problems Catalog!A:Z');
  if (rows.length === 0) {
    return { synced: 0, errors: ['No data found in sheet'] };
  }

  // First row is headers
  const headers = rows[0];
  const headerMap: Record<string, number> = {};
  headers.forEach((h, i) => {
    headerMap[h] = i;
  });

  let synced = 0;
  const errors: string[] = [];

  // Process data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const getValue = (col: string) => row[headerMap[col]] || '';

    const specNum = getValue('Spec #');
    const id = getValue('ID');
    const status = getValue('Status');

    // Skip empty rows
    if (!id || !status || status.trim() === '') continue;

    const smeId = getOrCreateExpert(getValue('SME'));
    const feedbackId = getOrCreateExpert(getValue('Feedback'));
    const qaId = getOrCreateExpert(getValue('QA'));
    const engineerId = getOrCreateExpert(getValue('Engineer'));
    const finalReviewerId = getOrCreateExpert(getValue('Final Reviewer'));

    upsertProblem({
      problemId: id,
      specNumber: specNum ? parseInt(specNum, 10) : undefined,
      environment: 'PE',
      status: status as ProblemStatus,
      smeId,
      feedbackId,
      qaId,
      engineerId,
      finalReviewerId,
      week: getValue('Week') ? parseInt(getValue('Week'), 10) : undefined,
      problemDoc: getValue('Problem Doc') || undefined,
      groundTruth: getValue('Problem Ground Truth') || getValue('Ground Truth') || undefined,
      specFolder: getValue('Spec Folder') || undefined,
      specDoc: getValue('Spec Doc') || undefined,
      specDataFolder: getValue('Spec Data Folder') || undefined,
      dockerContainer: getValue('Docker Container') || undefined,
      prLink: getValue('PR Link') || undefined,
      blockerReason: getValue('Blocker Reason') || undefined,
      sonnetPassRate: getValue('Sonnet 4.5  Pass @ 10') || undefined,
      opusPassRate: getValue('Opus 4.1 Pass @ 10') || undefined,
      separateEnvironmentInit: getValue('Separate Environment Init')?.toUpperCase() === 'TRUE',
      taigaTag: getValue('Taiga Tag') || undefined,
      explainerVideo: getValue('Explainer Video') || undefined,
      taskDescription: getValue('Task Description') || undefined,
      notes: getValue('Notes') || undefined,
    });

    synced++;
  }

  return { synced, errors };
}

// Sync IB Problems from Google Sheets
export async function syncIBProblems(): Promise<{ synced: number; errors: string[] }> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID_IB;
  if (!spreadsheetId) {
    return { synced: 0, errors: ['IB Sheet ID not configured'] };
  }

  // Initialize database
  getDb();

  const rows = await fetchSheetData(spreadsheetId, 'IB Problems Catalog!A:Z');
  if (rows.length === 0) {
    return { synced: 0, errors: ['No data found in sheet'] };
  }

  // First row is headers
  const headers = rows[0];
  const headerMap: Record<string, number> = {};
  headers.forEach((h, i) => {
    headerMap[h] = i;
  });

  let synced = 0;
  const errors: string[] = [];

  // Process data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const getValue = (col: string) => row[headerMap[col]] || '';

    const specNum = getValue('Spec');
    const id = getValue('ID');
    const status = getValue('Status');

    // Skip empty rows
    if (!id || !status || status.trim() === '') continue;

    const smeId = getOrCreateExpert(getValue('SME'));
    const feedbackId = getOrCreateExpert(getValue('Feedback'));
    const qaId = getOrCreateExpert(getValue('QA'));
    const engineerId = getOrCreateExpert(getValue('Engineer'));
    const finalReviewerId = getOrCreateExpert(getValue('Final Reviewer'));

    upsertProblem({
      problemId: id,
      specNumber: specNum ? parseInt(specNum, 10) : undefined,
      environment: 'IB',
      status: status as ProblemStatus,
      smeId,
      feedbackId,
      qaId,
      engineerId,
      finalReviewerId,
      week: getValue('Week') ? parseInt(getValue('Week'), 10) : undefined,
      problemDoc: getValue('Problem Doc') || undefined,
      groundTruth: getValue('Ground Truth') || undefined,
      specFolder: getValue('Spec Folder') || undefined,
      specDoc: getValue('Spec Doc') || undefined,
      specDataFolder: getValue('Spec Data Folder') || undefined,
      dockerContainer: getValue('Docker Container') || undefined,
      prLink: getValue('PR Link') || undefined,
      blockerReason: getValue('Blocker Reason') || undefined,
      sonnetPassRate: getValue('Taiga Score Pass @ 10') || undefined,
      separateEnvironmentInit: getValue('Separate Environment Init')?.toUpperCase() === 'TRUE',
      taigaTag: getValue('Taiga Tag') || undefined,
      explainerVideo: getValue('Explainer Video') || undefined,
      taskDescription: getValue('Task Description') || undefined,
      notes: getValue('Notes') || undefined,
    });

    synced++;
  }

  return { synced, errors };
}

// Sync all sheets
export async function syncAllSheets(): Promise<{
  pe: { synced: number; errors: string[] };
  ib: { synced: number; errors: string[] };
}> {
  const [pe, ib] = await Promise.all([
    syncPEProblems(),
    syncIBProblems(),
  ]);

  return { pe, ib };
}
