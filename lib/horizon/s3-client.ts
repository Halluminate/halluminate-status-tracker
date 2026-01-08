import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'taiga-horizon';
const REGION = process.env.AWS_REGION || 'us-east-1';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3Client;
}

// Horizon workflow status mapping
export type HorizonWorkflowStatus =
  | 'in_progress'
  | 'review_1'
  | 'review_2'
  | 'ready_for_delivery'
  | 'traj_testing'
  | 'delivered'
  | 'blocked';

// Map Horizon status to display status (matching Horizon UI)
export function mapHorizonStatus(status: HorizonWorkflowStatus | string): string {
  switch (status) {
    case 'in_progress':
    case 'draft':
      return 'In-Progress';
    case 'review_1':
    case 'review':
    case 'submitted':
      return 'Review 1';
    case 'review_2':
      return 'Review 2';
    case 'ready_for_delivery':
      return 'Ready for Delivery';
    case 'traj_testing':
      return 'Trajectory Testing';
    case 'delivered':
    case 'approved':
      return 'Delivered';
    case 'blocked':
      return 'Blocked';
    default:
      return status || 'Unknown';
  }
}

// Types matching Horizon's S3 structure
export interface HorizonUser {
  id: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export interface HorizonSession {
  id: string;
  environmentName: string;
  problemNumber: number;
  problemName?: string;
  firstName: string;
  lastName: string;
  status?: string;
  workflowStatus?: HorizonWorkflowStatus;
  createdAt: string;
  updatedAt?: string;
  week?: number;
}

export interface HorizonProblemData {
  title?: string;
  description?: string;
  status?: string;
  workflowStatus?: HorizonWorkflowStatus;
  week?: number;
  verifiers?: any[];
}

// Get a JSON object from S3
async function getJsonFromS3<T>(key: string): Promise<T | null> {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    const response = await client.send(command);
    const body = await response.Body?.transformToString();
    if (!body) return null;
    return JSON.parse(body) as T;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}

// List all objects with a given prefix
async function listObjectsWithPrefix(prefix: string): Promise<string[]> {
  const client = getS3Client();
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const response = await client.send(command);

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key) {
          keys.push(obj.Key);
        }
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return keys;
}

// Get all users from Horizon
export async function getAllHorizonUsers(): Promise<HorizonUser[]> {
  const keys = await listObjectsWithPrefix('users/');
  const users: HorizonUser[] = [];

  // Filter for user profile files (users/{name}.json, not subdirectories)
  const userProfileKeys = keys.filter(key => {
    const match = key.match(/^users\/([^/]+)\.json$/);
    return match !== null;
  });

  for (const key of userProfileKeys) {
    const user = await getJsonFromS3<HorizonUser>(key);
    if (user) {
      users.push(user);
    }
  }

  return users;
}

// Get all sessions for a user
export async function getUserSessions(firstName: string, lastName: string): Promise<HorizonSession[]> {
  const userKey = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`;
  const sessionsKey = `users/${userKey}/sessions.json`;

  const sessions = await getJsonFromS3<HorizonSession[]>(sessionsKey);

  if (!sessions) return [];

  // Normalize sessions to ensure firstName/lastName are populated
  return sessions.map(session => ({
    ...session,
    firstName: session.firstName || firstName,
    lastName: session.lastName || lastName,
  }));
}

// Get all sessions across all users
export async function getAllSessions(): Promise<HorizonSession[]> {
  const users = await getAllHorizonUsers();
  const allSessions: HorizonSession[] = [];

  for (const user of users) {
    const sessions = await getUserSessions(user.firstName, user.lastName);
    allSessions.push(...sessions);
  }

  return allSessions;
}

// Get problem data for a specific session
export async function getProblemData(
  firstName: string,
  lastName: string,
  environmentName: string,
  problemNumber: number
): Promise<HorizonProblemData | null> {
  const userKey = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`;
  const problemKey = `users/${userKey}/${environmentName}/p${problemNumber}/problem.json`;

  return getJsonFromS3<HorizonProblemData>(problemKey);
}

// Get session metadata
export async function getSessionMetadata(
  firstName: string,
  lastName: string,
  environmentName: string,
  problemNumber: number
): Promise<HorizonSession | null> {
  const userKey = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`;
  const sessionKey = `users/${userKey}/${environmentName}/p${problemNumber}/session.json`;

  return getJsonFromS3<HorizonSession>(sessionKey);
}

// Environment types
export type EnvironmentCategory =
  | 'PE'
  | 'IB'
  | 'Hedge Fund Long Horizon'
  | 'Commercial Real Estate Long Horizon'
  | 'PE Long Horizon'
  | 'IB Long Horizon';

export interface EnvironmentDraft {
  name: string;
  displayName: string;
  description?: string;
  category?: EnvironmentCategory;
  specNumber?: number;
  createdBy?: { firstName: string; lastName: string };
  createdAt?: string;
  updatedAt?: string;
  status?: 'draft' | 'submitted';
}

// Get all draft environments from S3
export async function getAllDraftEnvironments(): Promise<EnvironmentDraft[]> {
  const client = getS3Client();
  const prefix = 'environments/';

  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
    Delimiter: '/',
  });

  const response = await client.send(command);

  if (!response.CommonPrefixes) {
    return [];
  }

  const drafts: EnvironmentDraft[] = [];

  for (const prefixObj of response.CommonPrefixes) {
    if (!prefixObj.Prefix) continue;

    const envName = prefixObj.Prefix.replace(prefix, '').replace('/', '');
    const metadataKey = `${prefixObj.Prefix}metadata.json`;

    const draft = await getJsonFromS3<EnvironmentDraft>(metadataKey);
    if (draft) {
      drafts.push(draft);
    }
  }

  return drafts;
}

// Get environment category for a given environment name
export async function getEnvironmentCategory(envName: string): Promise<EnvironmentCategory | null> {
  const draft = await getJsonFromS3<EnvironmentDraft>(`environments/${envName}/metadata.json`);
  return draft?.category || null;
}

// Build a map of environment name -> category
export async function buildEnvironmentCategoryMap(): Promise<Map<string, EnvironmentCategory>> {
  const drafts = await getAllDraftEnvironments();
  const map = new Map<string, EnvironmentCategory>();

  for (const draft of drafts) {
    if (draft.category) {
      map.set(draft.name, draft.category);
    }
  }

  return map;
}

// Activity log types
export interface ActivityEntry {
  id: string;
  type: string;
  actor: { firstName: string; lastName: string };
  itemId?: string;
  itemType?: string;
  description?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
}

// Get activity log from S3
export async function getActivityLog(limit: number = 500): Promise<ActivityEntry[]> {
  const entries = await getJsonFromS3<ActivityEntry[]>('admin/activity-log.json');
  if (!entries) return [];
  return entries.slice(0, limit);
}

// Compute activity stats per expert (all time from activity log)
export interface ExpertActivityStats {
  expertName: string;
  activityCount: number;
  activeDates: string[];  // List of dates (YYYY-MM-DD) the expert was active
  daysActiveLastWeek: number;  // Count of days active in the last 7 days
}

export async function getActivityByExpert(): Promise<Map<string, ExpertActivityStats>> {
  const activityLog = await getActivityLog(500);
  const stats = new Map<string, ExpertActivityStats>();
  const expertDays = new Map<string, Set<string>>();

  // Calculate date 7 days ago
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  for (const entry of activityLog) {
    const expertName = `${entry.actor.firstName} ${entry.actor.lastName}`;
    const entryDate = new Date(entry.timestamp);
    const dayKey = entryDate.toISOString().split('T')[0];

    // Initialize if needed
    if (!stats.has(expertName)) {
      stats.set(expertName, {
        expertName,
        activityCount: 0,
        activeDates: [],
        daysActiveLastWeek: 0,
      });
      expertDays.set(expertName, new Set());
    }

    // Increment activity count
    stats.get(expertName)!.activityCount++;

    // Track unique days
    expertDays.get(expertName)!.add(dayKey);
  }

  // Set active dates and count last week days
  for (const [expertName, days] of expertDays) {
    if (stats.has(expertName)) {
      const sortedDates = Array.from(days).sort().reverse();
      stats.get(expertName)!.activeDates = sortedDates;

      // Count days in last 7 days
      const daysLastWeek = sortedDates.filter(dateStr => {
        const date = new Date(dateStr);
        return date >= sevenDaysAgo;
      }).length;
      stats.get(expertName)!.daysActiveLastWeek = daysLastWeek;
    }
  }

  return stats;
}

// Review tracking from activity log
export interface ExpertReviewStats {
  expertName: string;
  reviewsThisWeek: number;
  reviewsThisMonth: number;
  totalReviews: number;
}

// Get review counts by expert from activity log
// Reviews are detected by status changes: review_1 → review_2 (Review 1 complete)
// or review_2 → ready_for_delivery/traj_testing (Review 2 complete)
export async function getReviewsByExpert(): Promise<Map<string, ExpertReviewStats>> {
  const activityLog = await getActivityLog(1000); // Get more entries for reviews
  const stats = new Map<string, ExpertReviewStats>();

  // Calculate date boundaries
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  for (const entry of activityLog) {
    // Look for status change activities that indicate a review
    const isReviewActivity =
      // Check if it's a status change with review progression
      (entry.oldValue === 'review_1' && entry.newValue === 'review_2') ||
      (entry.oldValue === 'review_1' && entry.newValue === 'ready_for_delivery') ||
      (entry.oldValue === 'review_2' && entry.newValue === 'ready_for_delivery') ||
      (entry.oldValue === 'review_2' && entry.newValue === 'traj_testing') ||
      (entry.oldValue === 'review' && entry.newValue === 'review_2') ||
      (entry.oldValue === 'submitted' && entry.newValue === 'review_2') ||
      // Also check for explicit review types
      entry.type === 'review_completed' ||
      entry.type === 'review_submitted' ||
      entry.type === 'review_approved' ||
      // Check description for review keywords
      (entry.description?.toLowerCase().includes('review') && entry.description?.toLowerCase().includes('complet'));

    if (!isReviewActivity) continue;

    const expertName = `${entry.actor.firstName} ${entry.actor.lastName}`;
    const entryDate = new Date(entry.timestamp);

    // Initialize if needed
    if (!stats.has(expertName)) {
      stats.set(expertName, {
        expertName,
        reviewsThisWeek: 0,
        reviewsThisMonth: 0,
        totalReviews: 0,
      });
    }

    const expertStats = stats.get(expertName)!;
    expertStats.totalReviews++;

    if (entryDate >= startOfWeek) {
      expertStats.reviewsThisWeek++;
    }
    if (entryDate >= startOfMonth) {
      expertStats.reviewsThisMonth++;
    }
  }

  return stats;
}

// Problem info with dates
export interface ProblemInfo {
  id: string;
  environmentName: string;
  problemNumber: number;
  problemName?: string;
  expert: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  category?: EnvironmentCategory;
}

// Get all problems with their initiation dates
export async function getAllProblemsWithDates(): Promise<ProblemInfo[]> {
  const users = await getAllHorizonUsers();
  const envCategoryMap = await buildEnvironmentCategoryMap();
  const problems: ProblemInfo[] = [];

  for (const user of users) {
    const sessions = await getUserSessions(user.firstName, user.lastName);

    for (const session of sessions) {
      problems.push({
        id: session.id,
        environmentName: session.environmentName,
        problemNumber: session.problemNumber,
        problemName: session.problemName,
        expert: `${session.firstName} ${session.lastName}`,
        status: mapHorizonStatus(session.workflowStatus || session.status || 'in_progress'),
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        category: envCategoryMap.get(session.environmentName) || undefined,
      });
    }
  }

  // Sort by creation date (most recent first)
  problems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return problems;
}
