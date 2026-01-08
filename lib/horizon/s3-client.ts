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

// Stage transition entry from admin/process-metrics/stage-transitions.json
export interface StageTransition {
  id: string;
  problemId: string;
  environmentName: string;
  problemNumber: number;
  writer: { firstName: string; lastName: string };
  fromStatus: string | null;
  toStatus: string;
  actor: { firstName: string; lastName: string };
  timestamp: string;
}

// Get stage transitions from S3
export async function getStageTransitions(): Promise<StageTransition[]> {
  const data = await getJsonFromS3<{ transitions: StageTransition[]; lastPruned?: string }>('admin/process-metrics/stage-transitions.json');
  return data?.transitions || [];
}

// Extended session info with reviewer assignments
export interface SessionWithReviewers {
  id: string;
  environmentName: string;
  problemNumber: number;
  problemName?: string;
  workflowStatus: string;
  writer: { firstName: string; lastName: string };
  assignedTo?: { firstName: string; lastName: string };  // Current reviewer
  dataReviewer?: { firstName: string; lastName: string }; // Trajectory reviewer
  createdAt: string;
  updatedAt?: string;
}

// Get all sessions with their reviewer assignments from S3
export async function getAllSessionsWithReviewers(): Promise<SessionWithReviewers[]> {
  const users = await getAllHorizonUsers();
  const sessions: SessionWithReviewers[] = [];

  for (const user of users) {
    const userKey = `${user.firstName.toLowerCase()}-${user.lastName.toLowerCase()}`;
    const keys = await listObjectsWithPrefix(`users/${userKey}/`);

    // Find session.json files for each problem
    const sessionKeys = keys.filter(key => key.endsWith('/session.json'));

    for (const sessionKey of sessionKeys) {
      const sessionData = await getJsonFromS3<{
        id: string;
        firstName: string;
        lastName: string;
        environmentName: string;
        problemNumber: number;
        problemName?: string;
        status?: string;
        workflowStatus?: string;
        writer?: { firstName: string; lastName: string };
        assignedTo?: { firstName: string; lastName: string };
        dataReviewer?: { firstName: string; lastName: string };
        createdAt: string;
        updatedAt?: string;
      }>(sessionKey);

      if (sessionData) {
        sessions.push({
          id: sessionData.id,
          environmentName: sessionData.environmentName,
          problemNumber: sessionData.problemNumber,
          problemName: sessionData.problemName,
          workflowStatus: sessionData.workflowStatus || sessionData.status || 'in_progress',
          writer: sessionData.writer || { firstName: sessionData.firstName, lastName: sessionData.lastName },
          assignedTo: sessionData.assignedTo,
          dataReviewer: sessionData.dataReviewer,
          createdAt: sessionData.createdAt,
          updatedAt: sessionData.updatedAt,
        });
      }
    }
  }

  return sessions;
}

// Review tracking from session data
export interface ExpertReviewStats {
  expertName: string;
  reviewer1Count: number;      // Total Reviewer 1 assignments (assignedTo)
  reviewer2Count: number;      // Total Reviewer 2 assignments (dataReviewer)
  totalReviews: number;        // Combined R1 + R2
  reviewsThisWeek: number;
  reviewsThisMonth: number;
  problemsReachedTrajThisWeek: number;
  problemsReachedTrajThisMonth: number;
  totalProblemsReachedTraj: number;
}

// Get review counts by expert using session data
// Based on Horizon data model:
// - assignedTo = Reviewer 1 (first reviewer)
// - dataReviewer = Reviewer 2 (data/trajectory reviewer)
// Counts ALL current assignments (not filtered by status)
export async function getReviewsByExpert(): Promise<Map<string, ExpertReviewStats>> {
  const sessions = await getAllSessionsWithReviewers();
  const transitions = await getStageTransitions();

  const stats = new Map<string, ExpertReviewStats>();

  // Calculate date boundaries
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Helper to ensure stats entry exists
  const ensureStats = (name: string): ExpertReviewStats => {
    if (!stats.has(name)) {
      stats.set(name, {
        expertName: name,
        reviewer1Count: 0,
        reviewer2Count: 0,
        totalReviews: 0,
        reviewsThisWeek: 0,
        reviewsThisMonth: 0,
        problemsReachedTrajThisWeek: 0,
        problemsReachedTrajThisMonth: 0,
        totalProblemsReachedTraj: 0,
      });
    }
    return stats.get(name)!;
  };

  // Count reviews from session state
  for (const session of sessions) {
    // Reviewer 1: assignedTo field (count ALL assignments)
    if (session.assignedTo && session.assignedTo.firstName) {
      const r1Name = `${session.assignedTo.firstName} ${session.assignedTo.lastName}`.trim();
      if (r1Name) {
        const r1Stats = ensureStats(r1Name);
        r1Stats.reviewer1Count++;
        r1Stats.totalReviews++;

        // Use updatedAt for timing
        if (session.updatedAt) {
          const updatedDate = new Date(session.updatedAt);
          if (updatedDate >= startOfWeek) {
            r1Stats.reviewsThisWeek++;
          }
          if (updatedDate >= startOfMonth) {
            r1Stats.reviewsThisMonth++;
          }
        }
      }
    }

    // Reviewer 2: dataReviewer field (count ALL assignments)
    if (session.dataReviewer && session.dataReviewer.firstName) {
      const r2Name = `${session.dataReviewer.firstName} ${session.dataReviewer.lastName}`.trim();
      if (r2Name) {
        const r2Stats = ensureStats(r2Name);
        r2Stats.reviewer2Count++;
        r2Stats.totalReviews++;

        // Use updatedAt for timing
        if (session.updatedAt) {
          const updatedDate = new Date(session.updatedAt);
          if (updatedDate >= startOfWeek) {
            r2Stats.reviewsThisWeek++;
          }
          if (updatedDate >= startOfMonth) {
            r2Stats.reviewsThisMonth++;
          }
        }
      }
    }
  }

  // Track problems reaching trajectory for the writer using transitions (for accurate timing)
  for (const transition of transitions) {
    if (transition.toStatus === 'traj_testing') {
      const writerName = `${transition.writer.firstName} ${transition.writer.lastName}`;
      const transitionDate = new Date(transition.timestamp);

      const writerStats = ensureStats(writerName);
      writerStats.totalProblemsReachedTraj++;

      if (transitionDate >= startOfWeek) {
        writerStats.problemsReachedTrajThisWeek++;
      }
      if (transitionDate >= startOfMonth) {
        writerStats.problemsReachedTrajThisMonth++;
      }
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
