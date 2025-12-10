import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { Expert, ExpertSummary, Problem, TimeEntry, WeeklySnapshot } from '../types';

// Find the project directory - look for package.json
function findProjectDir(): string {
  let dir = process.cwd();

  // If cwd has expert-management in it, we're probably in the right place
  if (dir.includes('expert-management')) {
    // Navigate up to find expert-management root
    while (!fs.existsSync(path.join(dir, 'package.json')) && dir !== '/') {
      dir = path.dirname(dir);
    }
    return dir;
  }

  // Otherwise try to find expert-management subdirectory
  const expertMgmtPath = path.join(dir, 'expert-management');
  if (fs.existsSync(expertMgmtPath)) {
    return expertMgmtPath;
  }

  // Fallback to cwd
  return dir;
}

const PROJECT_DIR = findProjectDir();
const DATA_DIR = path.join(PROJECT_DIR, 'data');
const DB_PATH = path.join(DATA_DIR, 'experts.db');

// Ensure data directory exists (lazy initialization)
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    ensureDataDir();
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
  const schemaPath = path.join(PROJECT_DIR, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    // Split by semicolons and execute each statement
    const statements = schema.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      if (stmt.trim()) {
        db!.exec(stmt + ';');
      }
    }
  }
}

// Expert operations
export function getAllExperts(): Expert[] {
  const db = getDb();
  return db.prepare('SELECT * FROM experts ORDER BY name').all() as Expert[];
}

export function getExpertByName(name: string): Expert | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM experts WHERE name = ?').get(name) as Expert | undefined;
}

export function getExpertById(id: number): Expert | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM experts WHERE id = ?').get(id) as Expert | undefined;
}

export function upsertExpert(expert: Partial<Expert> & { name: string }): Expert {
  const db = getDb();
  const existing = getExpertByName(expert.name);

  if (existing) {
    const stmt = db.prepare(`
      UPDATE experts
      SET hourly_rate = COALESCE(?, hourly_rate),
          rippling_id = COALESCE(?, rippling_id),
          email = COALESCE(?, email),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(expert.hourlyRate, expert.ripplingId, expert.email, existing.id);
    return getExpertById(existing.id)!;
  } else {
    const stmt = db.prepare(`
      INSERT INTO experts (name, hourly_rate, rippling_id, email)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      expert.name,
      expert.hourlyRate ?? 150,
      expert.ripplingId ?? null,
      expert.email ?? null
    );
    return getExpertById(result.lastInsertRowid as number)!;
  }
}

// Problem operations
export function getAllProblems(environment?: 'PE' | 'IB'): Problem[] {
  const db = getDb();
  if (environment) {
    return db.prepare('SELECT * FROM problems WHERE environment = ? ORDER BY spec_number, problem_id').all(environment) as Problem[];
  }
  return db.prepare('SELECT * FROM problems ORDER BY environment, spec_number, problem_id').all() as Problem[];
}

export function getProblemsByExpert(expertId: number): Problem[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM problems
    WHERE sme_id = ? OR engineer_id = ? OR reviewer_id = ? OR content_reviewer_id = ?
    ORDER BY environment, spec_number, problem_id
  `).all(expertId, expertId, expertId, expertId) as Problem[];
}

export function upsertProblem(problem: Partial<Problem> & { problemId: string; environment: 'PE' | 'IB' }): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO problems (
      problem_id, spec_number, environment, status,
      sme_id, feedback_id, qa_id, content_reviewer_id, engineer_id, reviewer_id, final_reviewer_id,
      week, problem_doc, ground_truth, spec_folder, spec_doc, spec_data_folder, docker_container,
      pr_link, blocker_reason, sonnet_pass_rate, opus_pass_rate,
      separate_environment_init, taiga_tag, explainer_video, task_description, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(problem_id, environment) DO UPDATE SET
      spec_number = excluded.spec_number,
      status = excluded.status,
      sme_id = excluded.sme_id,
      feedback_id = excluded.feedback_id,
      qa_id = excluded.qa_id,
      content_reviewer_id = excluded.content_reviewer_id,
      engineer_id = excluded.engineer_id,
      reviewer_id = excluded.reviewer_id,
      final_reviewer_id = excluded.final_reviewer_id,
      week = excluded.week,
      problem_doc = excluded.problem_doc,
      ground_truth = excluded.ground_truth,
      spec_folder = excluded.spec_folder,
      spec_doc = excluded.spec_doc,
      spec_data_folder = excluded.spec_data_folder,
      docker_container = excluded.docker_container,
      pr_link = excluded.pr_link,
      blocker_reason = excluded.blocker_reason,
      sonnet_pass_rate = excluded.sonnet_pass_rate,
      opus_pass_rate = excluded.opus_pass_rate,
      separate_environment_init = excluded.separate_environment_init,
      taiga_tag = excluded.taiga_tag,
      explainer_video = excluded.explainer_video,
      task_description = excluded.task_description,
      notes = excluded.notes,
      updated_at = CURRENT_TIMESTAMP
  `);

  stmt.run(
    problem.problemId,
    problem.specNumber ?? null,
    problem.environment,
    problem.status ?? 'Unknown',
    problem.smeId ?? null,
    problem.feedbackId ?? null,
    problem.qaId ?? null,
    problem.contentReviewerId ?? null,
    problem.engineerId ?? null,
    problem.reviewerId ?? null,
    problem.finalReviewerId ?? null,
    problem.week ?? null,
    problem.problemDoc ?? null,
    problem.groundTruth ?? null,
    problem.specFolder ?? null,
    problem.specDoc ?? null,
    problem.specDataFolder ?? null,
    problem.dockerContainer ?? null,
    problem.prLink ?? null,
    problem.blockerReason ?? null,
    problem.sonnetPassRate ?? null,
    problem.opusPassRate ?? null,
    problem.separateEnvironmentInit ?? false,
    problem.taigaTag ?? null,
    problem.explainerVideo ?? null,
    problem.taskDescription ?? null,
    problem.notes ?? null
  );
}

// Time entry operations
export function getTimeEntriesByExpert(expertId: number): TimeEntry[] {
  const db = getDb();
  return db.prepare('SELECT * FROM time_entries WHERE expert_id = ? ORDER BY week_start DESC').all(expertId) as TimeEntry[];
}

export function upsertTimeEntry(entry: Partial<TimeEntry> & { expertId: number; weekStart: Date }): void {
  const db = getDb();
  const weekStartStr = entry.weekStart.toISOString().split('T')[0];

  const stmt = db.prepare(`
    INSERT INTO time_entries (
      expert_id, week_start, hours_worked, hours_approved,
      submission_status, approval_status, rippling_entry_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(expert_id, week_start) DO UPDATE SET
      hours_worked = excluded.hours_worked,
      hours_approved = excluded.hours_approved,
      submission_status = excluded.submission_status,
      approval_status = excluded.approval_status,
      rippling_entry_id = excluded.rippling_entry_id,
      updated_at = CURRENT_TIMESTAMP
  `);

  stmt.run(
    entry.expertId,
    weekStartStr,
    entry.hoursWorked ?? 0,
    entry.hoursApproved ?? null,
    entry.submissionStatus ?? null,
    entry.approvalStatus ?? null,
    entry.ripplingEntryId ?? null
  );
}

// Summary queries
// Names to exclude from expert summaries (non-SMEs or duplicates)
const EXCLUDED_NAMES = ['Wington', 'Gorka', 'Wyatt', 'Will', 'Z L', 'Rob', 'Jerry'];

export function getExpertSummaries(): ExpertSummary[] {
  const db = getDb();
  const excludePlaceholders = EXCLUDED_NAMES.map(() => '?').join(', ');
  return db.prepare(`
    SELECT
      e.id,
      e.name,
      e.hourly_rate as hourlyRate,
      COUNT(DISTINCT CASE WHEN p.status IN ('Problem Writeup', 'Problem Feedback', 'Problem QA', 'Feedback Requested') THEN p.id END) as problemsInProgress,
      COUNT(DISTINCT CASE WHEN p.status NOT IN ('Problem Writeup', 'Problem Feedback', 'Problem QA', 'Feedback Requested') THEN p.id END) as problemsDelivered,
      COUNT(DISTINCT p.id) as totalProblemsAssigned,
      COALESCE((SELECT SUM(hours_worked) FROM time_entries WHERE expert_id = e.id), 0) as totalHours,
      COALESCE((SELECT SUM(hours_worked) FROM time_entries WHERE expert_id = e.id), 0) * e.hourly_rate as totalCost,
      CASE
        WHEN COUNT(DISTINCT p.id) > 0
        THEN (COALESCE((SELECT SUM(hours_worked) FROM time_entries WHERE expert_id = e.id), 0) * e.hourly_rate) / COUNT(DISTINCT p.id)
        ELSE NULL
      END as costPerAssigned,
      CASE
        WHEN COUNT(DISTINCT CASE WHEN p.status NOT IN ('Problem Writeup', 'Problem Feedback', 'Problem QA', 'Feedback Requested') THEN p.id END) > 0
        THEN (COALESCE((SELECT SUM(hours_worked) FROM time_entries WHERE expert_id = e.id), 0) * e.hourly_rate) / COUNT(DISTINCT CASE WHEN p.status NOT IN ('Problem Writeup', 'Problem Feedback', 'Problem QA', 'Feedback Requested') THEN p.id END)
        ELSE NULL
      END as costPerDelivered
    FROM experts e
    LEFT JOIN problems p ON e.id IN (p.sme_id, p.engineer_id, p.reviewer_id, p.content_reviewer_id)
    WHERE e.name NOT IN (${excludePlaceholders})
    GROUP BY e.id
    HAVING totalProblemsAssigned > 0 OR totalHours > 0
    ORDER BY totalCost DESC
  `).all(...EXCLUDED_NAMES) as ExpertSummary[];
}

export function getExpertSummaryById(expertId: number): ExpertSummary | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT
      e.id,
      e.name,
      e.hourly_rate as hourlyRate,
      COUNT(DISTINCT CASE WHEN p.status IN ('Problem Writeup', 'Problem Feedback', 'Problem QA', 'Feedback Requested') THEN p.id END) as problemsInProgress,
      COUNT(DISTINCT CASE WHEN p.status NOT IN ('Problem Writeup', 'Problem Feedback', 'Problem QA', 'Feedback Requested') THEN p.id END) as problemsDelivered,
      COUNT(DISTINCT p.id) as totalProblemsAssigned,
      COALESCE((SELECT SUM(hours_worked) FROM time_entries WHERE expert_id = e.id), 0) as totalHours,
      COALESCE((SELECT SUM(hours_worked) FROM time_entries WHERE expert_id = e.id), 0) * e.hourly_rate as totalCost
    FROM experts e
    LEFT JOIN problems p ON e.id IN (p.sme_id, p.engineer_id, p.reviewer_id, p.content_reviewer_id)
    WHERE e.id = ?
    GROUP BY e.id
  `).get(expertId) as ExpertSummary | undefined;
}

// Get problem status breakdown for a specific expert
export function getExpertProblemBreakdown(expertId: number): Record<string, number> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM problems
    WHERE sme_id = ? OR engineer_id = ? OR reviewer_id = ? OR content_reviewer_id = ?
    GROUP BY status
    ORDER BY
      CASE status
        WHEN 'Problem Writeup' THEN 1
        WHEN 'Problem Feedback' THEN 2
        WHEN 'Feedback Requested' THEN 3
        WHEN 'Problem QA' THEN 4
        WHEN 'Ready To Build' THEN 5
        WHEN 'Taiga Testing' THEN 6
        WHEN 'Ready for Taiga' THEN 7
        WHEN 'QA' THEN 8
        WHEN 'QA Issues' THEN 9
        WHEN 'Changes Requested on PR' THEN 10
        WHEN 'Blocked' THEN 11
        WHEN 'Delivered' THEN 12
        ELSE 99
      END
  `).all(expertId, expertId, expertId, expertId) as { status: string; count: number }[];

  return rows.reduce((acc, row) => {
    acc[row.status] = row.count;
    return acc;
  }, {} as Record<string, number>);
}

// Get expert problems breakdown by week
export function getExpertWeeklyBreakdown(expertId: number): { week: number | null; count: number; statuses: Record<string, number> }[] {
  const db = getDb();

  // Get counts by week
  const weekCounts = db.prepare(`
    SELECT
      week,
      COUNT(*) as count
    FROM problems
    WHERE sme_id = ? OR engineer_id = ? OR reviewer_id = ? OR content_reviewer_id = ?
    GROUP BY week
    ORDER BY
      CASE WHEN week IS NULL THEN 999 ELSE week END
  `).all(expertId, expertId, expertId, expertId) as { week: number | null; count: number }[];

  // Get status breakdown by week
  const statusByWeek = db.prepare(`
    SELECT
      week,
      status,
      COUNT(*) as count
    FROM problems
    WHERE sme_id = ? OR engineer_id = ? OR reviewer_id = ? OR content_reviewer_id = ?
    GROUP BY week, status
    ORDER BY week, status
  `).all(expertId, expertId, expertId, expertId) as { week: number | null; status: string; count: number }[];

  // Combine the data
  const statusMap = new Map<number | null, Record<string, number>>();
  for (const row of statusByWeek) {
    const weekKey = row.week;
    if (!statusMap.has(weekKey)) {
      statusMap.set(weekKey, {});
    }
    statusMap.get(weekKey)![row.status] = row.count;
  }

  return weekCounts.map(wc => ({
    week: wc.week,
    count: wc.count,
    statuses: statusMap.get(wc.week) || {}
  }));
}

// Get detailed expert stats including problems list
export function getExpertDetailedStats(expertId: number) {
  const db = getDb();
  const expert = getExpertById(expertId);
  if (!expert) return null;

  const summary = getExpertSummaryById(expertId);
  const weeklyBreakdown = getExpertWeeklyBreakdown(expertId);
  const statusBreakdown = getExpertProblemBreakdown(expertId);

  // Get all problems for this expert with details
  const problems = db.prepare(`
    SELECT
      p.*,
      sme.name as sme_name,
      eng.name as engineer_name,
      rev.name as reviewer_name,
      cr.name as content_reviewer_name
    FROM problems p
    LEFT JOIN experts sme ON p.sme_id = sme.id
    LEFT JOIN experts eng ON p.engineer_id = eng.id
    LEFT JOIN experts rev ON p.reviewer_id = rev.id
    LEFT JOIN experts cr ON p.content_reviewer_id = cr.id
    WHERE p.sme_id = ? OR p.engineer_id = ? OR p.reviewer_id = ? OR p.content_reviewer_id = ?
    ORDER BY p.week, p.environment, p.spec_number, p.problem_id
  `).all(expertId, expertId, expertId, expertId);

  // Get time entries
  const timeEntries = getTimeEntriesByExpert(expertId);

  return {
    expert,
    summary,
    weeklyBreakdown,
    statusBreakdown,
    problems,
    timeEntries
  };
}

// Get total unique problem counts for summary
export function getProblemTotals(): { totalProblems: number; inProgress: number; delivered: number } {
  const db = getDb();
  const result = db.prepare(`
    SELECT
      COUNT(*) as totalProblems,
      SUM(CASE WHEN status IN ('Problem Writeup', 'Problem Feedback', 'Problem QA', 'Feedback Requested') THEN 1 ELSE 0 END) as inProgress,
      SUM(CASE WHEN status NOT IN ('Problem Writeup', 'Problem Feedback', 'Problem QA', 'Feedback Requested') THEN 1 ELSE 0 END) as delivered
    FROM problems
  `).get() as { totalProblems: number; inProgress: number; delivered: number };
  return result;
}

// Status counts
export function getStatusCounts(environment?: 'PE' | 'IB'): Record<string, number> {
  const db = getDb();
  let query = 'SELECT status, COUNT(*) as count FROM problems';
  if (environment) {
    query += ' WHERE environment = ?';
  }
  query += ' GROUP BY status';

  const rows = environment
    ? db.prepare(query).all(environment) as { status: string; count: number }[]
    : db.prepare(query).all() as { status: string; count: number }[];

  return rows.reduce((acc, row) => {
    acc[row.status] = row.count;
    return acc;
  }, {} as Record<string, number>);
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
