import { parse } from 'csv-parse/sync';
import fs from 'fs';
import {
  upsertExpert,
  upsertProblem,
  upsertTimecard,
  getExpertByName,
} from '@/lib/db';
import { getExpertRate, type ProblemStatus } from '@/types/experts';

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

async function getOrCreateExpert(name: string | undefined): Promise<number | undefined> {
  if (!name) return undefined;
  const normalized = normalizeName(name);
  if (!normalized) return undefined;

  let expert = await getExpertByName(normalized);
  if (!expert) {
    expert = await upsertExpert({
      name: normalized,
      hourlyRate: getExpertRate(normalized),
    });
  }
  return expert.id;
}

// Import PE Problem Catalog CSV
export async function importPEProblems(csvPath: string): Promise<{ imported: number; errors: string[] }> {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  let imported = 0;
  const errors: string[] = [];

  for (const row of records) {
    const specNum = row['Spec #'];
    const id = row['ID'];
    const status = row['Status'];

    // Skip empty rows
    if (!id || !status || status.trim() === '') continue;

    const smeId = await getOrCreateExpert(row['SME']);
    const contentReviewerId = await getOrCreateExpert(row['Content Reviewer']);
    const engineerId = await getOrCreateExpert(row['Engineer']);
    const reviewerId = await getOrCreateExpert(row['Reviewer']);

    await upsertProblem({
      problemId: id,
      specNumber: specNum ? parseInt(specNum, 10) : undefined,
      environment: 'PE',
      status: status as ProblemStatus,
      smeId,
      contentReviewerId,
      engineerId,
      reviewerId,
      week: row['Week'] ? parseInt(row['Week'], 10) : undefined,
      problemDoc: row['Problem Doc'] || undefined,
      groundTruth: row['Problem Ground Truth'] || row['Ground Truth'] || undefined,
      specFolder: row['Spec Folder'] || undefined,
      prLink: row['PR Link'] || undefined,
      blockerReason: row['Blocker Reason'] || undefined,
      sonnetPassRate: row['Sonnet 4.5  Pass @ 10'] || undefined,
      opusPassRate: row['Opus 4.1 Pass @ 10'] || undefined,
      taskDescription: row['Task Description'] || undefined,
    });

    imported++;
  }

  return { imported, errors };
}

// Import IB Problem Catalog CSV
export async function importIBProblems(csvPath: string): Promise<{ imported: number; errors: string[] }> {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  let imported = 0;
  const errors: string[] = [];

  for (const row of records) {
    const specNum = row['Spec'];
    const id = row['ID'];
    const status = row['Status'];

    // Skip empty rows
    if (!id || !status || status.trim() === '') continue;

    const smeId = await getOrCreateExpert(row['SME']);
    const contentReviewerId = await getOrCreateExpert(row['Content Reviewer']);
    const engineerId = await getOrCreateExpert(row['Engineer']);
    const reviewerId = await getOrCreateExpert(row['Reviewer']);

    await upsertProblem({
      problemId: id,
      specNumber: specNum ? parseInt(specNum, 10) : undefined,
      environment: 'IB',
      status: status as ProblemStatus,
      smeId,
      contentReviewerId,
      engineerId,
      reviewerId,
      week: row['Week'] ? parseInt(row['Week'], 10) : undefined,
      problemDoc: row['Problem Doc'] || undefined,
      groundTruth: row['Ground Truth'] || undefined,
      specFolder: row['Spec Folder'] || undefined,
      prLink: row['PR Link'] || undefined,
      blockerReason: row['Blocker Reason'] || undefined,
      sonnetPassRate: row['Taiga Score Pass @ 10'] || undefined,
      taskDescription: row['Task Description'] || undefined,
    });

    imported++;
  }

  return { imported, errors };
}

// Parse hours from Rippling format (e.g., "7h 38m", "80h", "5h")
function parseHours(hoursStr: string): number {
  if (!hoursStr || hoursStr.trim() === '') return 0;

  let totalHours = 0;
  const trimmed = hoursStr.trim();

  // Match hours
  const hoursMatch = trimmed.match(/(\d+)h/);
  if (hoursMatch) {
    totalHours += parseInt(hoursMatch[1], 10);
  }

  // Match minutes
  const minutesMatch = trimmed.match(/(\d+)m/);
  if (minutesMatch) {
    totalHours += parseInt(minutesMatch[1], 10) / 60;
  }

  return totalHours;
}

// Parse Rippling time tracking text (tab-separated format from paste)
export async function parseRipplingTimeData(
  text: string,
  weekStart: Date
): Promise<{ imported: number; errors: string[] }> {
  const lines = text.trim().split('\n');
  let imported = 0;
  const errors: string[] = [];

  // Calculate week end (7 days after start)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  for (const line of lines) {
    // Split by multiple spaces or tabs
    const parts = line.trim().split(/\s{2,}|\t/).filter(p => p.trim());

    if (parts.length < 5) {
      errors.push(`Invalid line format: ${line}`);
      continue;
    }

    // Format: Name, Submission Status, Approval Status, ID, Total Hours, Approved Hours
    const [name, , , , totalHoursStr] = parts;

    // Parse approved hours (format: "80h / 80h" or just "80h")
    const approvedHoursStr = parts[5]?.split('/')[0]?.trim() || totalHoursStr;

    const expertId = await getOrCreateExpert(name);
    if (!expertId) {
      errors.push(`Could not find or create expert: ${name}`);
      continue;
    }

    const hoursWorked = parseHours(totalHoursStr);
    const hoursApproved = parseHours(approvedHoursStr);

    await upsertTimecard({
      employeeName: name,
      periodStart: weekStart,
      periodEnd: weekEnd,
      status: 'Imported',
      hoursRegular: hoursWorked,
      hoursApproved: hoursApproved,
      hoursTotal: hoursWorked,
    });

    imported++;
  }

  return { imported, errors };
}

// Helper to get current week's Monday
export function getCurrentWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Initialize database with schema (no-op for PostgreSQL, schema managed via migrations)
export function initializeDatabase(): void {
  // PostgreSQL schema is managed via migrations, no initialization needed
}
