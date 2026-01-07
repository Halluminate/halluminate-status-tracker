import { SheetData, StatusRow, ExpertSheetData, ExpertRow } from '@/types/status';
import {
  getAllHorizonUsers,
  getUserSessions,
  mapHorizonStatus,
  buildEnvironmentCategoryMap,
  HorizonSession,
  EnvironmentCategory,
} from './s3-client';

// Helper to determine if a category is "PE-like" or "IB-like"
function normalizeCategory(category: EnvironmentCategory | null): 'PE' | 'IB' | null {
  if (!category) return null;

  if (category === 'PE' || category === 'PE Long Horizon') {
    return 'PE';
  }
  if (category === 'IB' || category === 'IB Long Horizon') {
    return 'IB';
  }
  // For Hedge Fund and Commercial Real Estate, treat as PE for now
  if (category.includes('Long Horizon')) {
    return 'PE';
  }
  return null;
}

// Extract week number from session (could be from various sources)
function getWeekNumber(session: HorizonSession): number | null {
  // Try to get week from session metadata
  if (session.week !== undefined && session.week !== null) {
    return session.week;
  }
  // Default: return null if no week info
  return null;
}

// Build status aggregation for a given category
function buildStatusAggregation(
  sessions: HorizonSession[],
  envCategoryMap: Map<string, EnvironmentCategory>,
  targetCategory: 'PE' | 'IB'
): SheetData {
  const aggregation = new Map<string, { [key: string]: number }>();

  for (const session of sessions) {
    const envCategory = envCategoryMap.get(session.environmentName);
    const normalized = normalizeCategory(envCategory || null);

    if (normalized !== targetCategory) continue;

    // Map Horizon workflow status to status-tracker status
    const status = mapHorizonStatus(session.workflowStatus || session.status || 'in_progress');

    // Get week number
    const week = getWeekNumber(session);
    let weekKey = 'weekNA';
    if (week !== null && week >= 1 && week <= 7) {
      weekKey = `week${week}`;
    }

    // Initialize status entry if needed
    if (!aggregation.has(status)) {
      aggregation.set(status, {
        week1: 0, week2: 0, week3: 0, week4: 0,
        week5: 0, week6: 0, week7: 0, weekNA: 0,
      });
    }

    const statusData = aggregation.get(status)!;
    statusData[weekKey] = (statusData[weekKey] || 0) + 1;
  }

  // Convert to StatusRow array
  const rows: StatusRow[] = [];
  let grandTotal = 0;

  aggregation.forEach((weekCounts, status) => {
    const total =
      weekCounts.week1 + weekCounts.week2 + weekCounts.week3 +
      weekCounts.week4 + weekCounts.week5 + weekCounts.week6 +
      weekCounts.week7 + (weekCounts.weekNA || 0);

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

  rows.sort((a, b) => a.status.localeCompare(b.status));

  return { name: targetCategory, rows, grandTotal };
}

// Build expert aggregation for a given category
function buildExpertAggregation(
  sessions: HorizonSession[],
  envCategoryMap: Map<string, EnvironmentCategory>,
  targetCategory: 'PE' | 'IB'
): ExpertSheetData {
  const aggregation = new Map<string, { [key: string]: number }>();
  const seenProblems = new Map<string, Set<string>>(); // expert -> Set of problem IDs

  for (const session of sessions) {
    const envCategory = envCategoryMap.get(session.environmentName);
    const normalized = normalizeCategory(envCategory || null);

    if (normalized !== targetCategory) continue;

    // Get expert name (SME = writer)
    const expertName = `${session.firstName} ${session.lastName}`;
    if (!expertName.trim()) continue;

    // Create unique problem ID
    const problemId = `${session.environmentName}-p${session.problemNumber}`;

    // Check if we've already counted this problem for this expert
    if (!seenProblems.has(expertName)) {
      seenProblems.set(expertName, new Set());
    }
    const expertProblems = seenProblems.get(expertName)!;
    if (expertProblems.has(problemId)) continue;
    expertProblems.add(problemId);

    // Get week number
    const week = getWeekNumber(session);
    let weekKey = 'weekNA';
    if (week !== null && week >= 1 && week <= 7) {
      weekKey = `week${week}`;
    }

    // Initialize expert entry if needed
    if (!aggregation.has(expertName)) {
      aggregation.set(expertName, {
        week1: 0, week2: 0, week3: 0, week4: 0,
        week5: 0, week6: 0, week7: 0, weekNA: 0,
      });
    }

    const expertData = aggregation.get(expertName)!;
    expertData[weekKey] = (expertData[weekKey] || 0) + 1;
  }

  // Convert to ExpertRow array
  const rows: ExpertRow[] = [];
  let grandTotal = 0;

  aggregation.forEach((weekCounts, expert) => {
    const total =
      weekCounts.week1 + weekCounts.week2 + weekCounts.week3 +
      weekCounts.week4 + weekCounts.week5 + weekCounts.week6 +
      weekCounts.week7 + (weekCounts.weekNA || 0);

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

  rows.sort((a, b) => a.expert.localeCompare(b.expert));

  return { name: targetCategory, rows, grandTotal };
}

// Placeholder for delivered problems from legacy Taiga (before Horizon tracking)
const LEGACY_TAIGA_DELIVERED = {
  PE: 80,  // Problems delivered on Taiga before Horizon
  IB: 0,
};

// Add legacy delivered count to status data
function addLegacyDelivered(statusData: SheetData, legacyCount: number): SheetData {
  if (legacyCount === 0) return statusData;

  const deliveredRow = statusData.rows.find(r => r.status === 'Delivered');

  if (deliveredRow) {
    // Add to existing Delivered row
    deliveredRow.weekNA += legacyCount;
    deliveredRow.total += legacyCount;
  } else {
    // Create new Delivered row
    statusData.rows.push({
      status: 'Delivered',
      week1: 0, week2: 0, week3: 0, week4: 0,
      week5: 0, week6: 0, week7: 0,
      weekNA: legacyCount,
      total: legacyCount,
    });
  }

  statusData.grandTotal += legacyCount;
  statusData.rows.sort((a, b) => a.status.localeCompare(b.status));

  return statusData;
}

// Main function to fetch all data from Horizon (replaces fetchAllSheets)
export async function fetchAllFromHorizon(): Promise<{
  sheets: SheetData[];
  expertSheets: ExpertSheetData[];
}> {
  console.log('[Horizon] Starting data fetch from S3...');

  // 1. Get all users
  const users = await getAllHorizonUsers();
  console.log(`[Horizon] Found ${users.length} users`);

  // 2. Build environment category map
  const envCategoryMap = await buildEnvironmentCategoryMap();
  console.log(`[Horizon] Found ${envCategoryMap.size} environments with categories`);

  // 3. Get all sessions for all users
  const allSessions: HorizonSession[] = [];
  for (const user of users) {
    const sessions = await getUserSessions(user.firstName, user.lastName);
    allSessions.push(...sessions);
  }
  console.log(`[Horizon] Found ${allSessions.length} total sessions`);

  // 4. Build status aggregations for PE and IB
  let peStatusData = buildStatusAggregation(allSessions, envCategoryMap, 'PE');
  let ibStatusData = buildStatusAggregation(allSessions, envCategoryMap, 'IB');

  // 5. Add legacy Taiga delivered counts
  peStatusData = addLegacyDelivered(peStatusData, LEGACY_TAIGA_DELIVERED.PE);
  ibStatusData = addLegacyDelivered(ibStatusData, LEGACY_TAIGA_DELIVERED.IB);

  // 6. Build expert aggregations for PE and IB
  const peExpertData = buildExpertAggregation(allSessions, envCategoryMap, 'PE');
  const ibExpertData = buildExpertAggregation(allSessions, envCategoryMap, 'IB');

  console.log(`[Horizon] PE: ${peStatusData.grandTotal} problems (includes ${LEGACY_TAIGA_DELIVERED.PE} legacy delivered), IB: ${ibStatusData.grandTotal} problems`);

  return {
    sheets: [peStatusData, ibStatusData],
    expertSheets: [peExpertData, ibExpertData],
  };
}
