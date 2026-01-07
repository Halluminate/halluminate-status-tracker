// Database operations using PostgreSQL
import { query, queryOne, withTransaction } from './postgres';
import type {
  Expert,
  ExpertSummary,
  Problem,
  TimeEntry,
  WeeklyBonusInput,
  WeeklyBonusCalculation,
  ExpertBonusConfig,
  BonusParameters,
  ExpertBonusSummary,
  SyncRun,
  SyncError,
} from '../../types';

// ============================================
// EXPERT OPERATIONS
// ============================================

export async function getAllExperts(): Promise<Expert[]> {
  return query<Expert>('SELECT * FROM experts ORDER BY name');
}

export async function getExpertByName(name: string): Promise<Expert | null> {
  return queryOne<Expert>('SELECT * FROM experts WHERE name = $1', [name]);
}

export async function getExpertById(id: number): Promise<Expert | null> {
  return queryOne<Expert>('SELECT * FROM experts WHERE id = $1', [id]);
}

export async function upsertExpert(expert: Partial<Expert> & { name: string }): Promise<Expert> {
  const result = await queryOne<Expert>(`
    INSERT INTO experts (name, hourly_rate, rippling_id, email)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (name) DO UPDATE SET
      hourly_rate = COALESCE($2, experts.hourly_rate),
      rippling_id = COALESCE($3, experts.rippling_id),
      email = COALESCE($4, experts.email),
      updated_at = NOW()
    RETURNING *
  `, [expert.name, expert.hourlyRate ?? 150, expert.ripplingId ?? null, expert.email ?? null]);

  return result!;
}

// Create/update expert from Rippling employee data
export async function upsertExpertFromRippling(employeeName: string, hourlyRate?: number): Promise<Expert> {
  const result = await queryOne<Expert>(`
    INSERT INTO experts (name, hourly_rate, source, is_active)
    VALUES ($1, $2, 'rippling', true)
    ON CONFLICT (name) DO UPDATE SET
      hourly_rate = COALESCE($2, experts.hourly_rate),
      source = COALESCE(experts.source, 'rippling'),
      is_active = true,
      updated_at = NOW()
    RETURNING *
  `, [employeeName, hourlyRate ?? 150]);

  return result!;
}

// Link a Horizon user to an expert (by matching names or manual linking)
export async function linkHorizonUserToExpert(expertId: number, horizonUserId: string): Promise<void> {
  await query(`
    UPDATE experts SET horizon_user_id = $2, updated_at = NOW()
    WHERE id = $1
  `, [expertId, horizonUserId]);
}

// Auto-match Horizon users to experts by name
export async function autoMatchHorizonUsers(horizonUsers: { id: string; firstName: string; lastName: string }[]): Promise<{ matched: number; unmatched: string[] }> {
  let matched = 0;
  const unmatched: string[] = [];

  for (const user of horizonUsers) {
    const fullName = `${user.firstName} ${user.lastName}`;
    const horizonUserId = `${user.firstName.toLowerCase()}-${user.lastName.toLowerCase()}`;

    // Try to find expert with matching name
    const expert = await queryOne<Expert>(`
      SELECT * FROM experts WHERE LOWER(name) = LOWER($1)
    `, [fullName]);

    if (expert) {
      await linkHorizonUserToExpert(expert.id, horizonUserId);
      matched++;
    } else {
      unmatched.push(fullName);
    }
  }

  return { matched, unmatched };
}

// ============================================
// EXPERT SUMMARY QUERIES
// ============================================

const EXCLUDED_NAMES = ['Wington', 'Gorka', 'Wyatt', 'Will', 'Z L', 'Rob', 'Jerry'];

export async function getExpertSummaries(): Promise<ExpertSummary[]> {
  const excludePlaceholders = EXCLUDED_NAMES.map((_, i) => `$${i + 1}`).join(', ');

  return query<ExpertSummary>(`
    SELECT
      e.id,
      e.name,
      e.hourly_rate as "hourlyRate",
      e.horizon_user_id as "horizonUserId",
      e.source,
      e.is_active as "isActive",
      COUNT(DISTINCT CASE WHEN p.status IN ('Problem Writeup', 'Problem Feedback', 'Problem QA', 'Feedback Requested') THEN p.id END) as "problemsInProgress",
      COUNT(DISTINCT CASE WHEN p.status NOT IN ('Problem Writeup', 'Problem Feedback', 'Problem QA', 'Feedback Requested') THEN p.id END) as "problemsDelivered",
      COUNT(DISTINCT p.id) as "totalProblemsAssigned",
      COALESCE((SELECT SUM(hours_regular) FROM timecards WHERE expert_id = e.id), 0) as "totalHours",
      COALESCE((SELECT SUM(hours_regular) FROM timecards WHERE expert_id = e.id), 0) * e.hourly_rate as "totalCost",
      CASE
        WHEN COUNT(DISTINCT p.id) > 0
        THEN (COALESCE((SELECT SUM(hours_regular) FROM timecards WHERE expert_id = e.id), 0) * e.hourly_rate) / COUNT(DISTINCT p.id)
        ELSE NULL
      END as "costPerAssigned",
      CASE
        WHEN COUNT(DISTINCT CASE WHEN p.status NOT IN ('Problem Writeup', 'Problem Feedback', 'Problem QA', 'Feedback Requested') THEN p.id END) > 0
        THEN (COALESCE((SELECT SUM(hours_regular) FROM timecards WHERE expert_id = e.id), 0) * e.hourly_rate) / COUNT(DISTINCT CASE WHEN p.status NOT IN ('Problem Writeup', 'Problem Feedback', 'Problem QA', 'Feedback Requested') THEN p.id END)
        ELSE NULL
      END as "costPerDelivered"
    FROM experts e
    LEFT JOIN problems p ON e.id IN (p.sme_id, p.engineer_id, p.reviewer_id, p.content_reviewer_id)
    WHERE e.name NOT IN (${excludePlaceholders})
      AND COALESCE(e.is_active, true) = true
    GROUP BY e.id
    ORDER BY "totalHours" DESC NULLS LAST, e.name
  `, EXCLUDED_NAMES);
}

export async function getExpertSummaryById(expertId: number): Promise<ExpertSummary | null> {
  return queryOne<ExpertSummary>(`
    SELECT
      e.id,
      e.name,
      e.hourly_rate as "hourlyRate",
      COUNT(DISTINCT CASE WHEN p.status IN ('Problem Writeup', 'Problem Feedback', 'Problem QA', 'Feedback Requested') THEN p.id END) as "problemsInProgress",
      COUNT(DISTINCT CASE WHEN p.status NOT IN ('Problem Writeup', 'Problem Feedback', 'Problem QA', 'Feedback Requested') THEN p.id END) as "problemsDelivered",
      COUNT(DISTINCT p.id) as "totalProblemsAssigned",
      COALESCE((SELECT SUM(hours_worked) FROM time_entries WHERE expert_id = e.id), 0) as "totalHours",
      COALESCE((SELECT SUM(hours_worked) FROM time_entries WHERE expert_id = e.id), 0) * e.hourly_rate as "totalCost"
    FROM experts e
    LEFT JOIN problems p ON e.id IN (p.sme_id, p.engineer_id, p.reviewer_id, p.content_reviewer_id)
    WHERE e.id = $1
    GROUP BY e.id
  `, [expertId]);
}

// ============================================
// PROBLEM OPERATIONS
// ============================================

export async function getAllProblems(environment?: 'PE' | 'IB'): Promise<Problem[]> {
  if (environment) {
    return query<Problem>(
      'SELECT * FROM problems WHERE environment = $1 ORDER BY spec_number, problem_id',
      [environment]
    );
  }
  return query<Problem>('SELECT * FROM problems ORDER BY environment, spec_number, problem_id');
}

export async function getProblemsByExpert(expertId: number): Promise<Problem[]> {
  return query<Problem>(`
    SELECT * FROM problems
    WHERE sme_id = $1 OR engineer_id = $1 OR reviewer_id = $1 OR content_reviewer_id = $1
    ORDER BY environment, spec_number, problem_id
  `, [expertId]);
}

export async function upsertProblem(problem: Partial<Problem> & { problemId: string; environment: 'PE' | 'IB' }): Promise<void> {
  await query(`
    INSERT INTO problems (
      problem_id, spec_number, environment, status,
      sme_id, feedback_id, qa_id, content_reviewer_id, engineer_id, reviewer_id, final_reviewer_id,
      week, problem_doc, ground_truth, spec_folder, spec_doc, spec_data_folder, docker_container,
      pr_link, blocker_reason, sonnet_pass_rate, opus_pass_rate,
      separate_environment_init, taiga_tag, explainer_video, task_description, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
    ON CONFLICT(problem_id, environment) DO UPDATE SET
      spec_number = EXCLUDED.spec_number,
      status = EXCLUDED.status,
      sme_id = EXCLUDED.sme_id,
      feedback_id = EXCLUDED.feedback_id,
      qa_id = EXCLUDED.qa_id,
      content_reviewer_id = EXCLUDED.content_reviewer_id,
      engineer_id = EXCLUDED.engineer_id,
      reviewer_id = EXCLUDED.reviewer_id,
      final_reviewer_id = EXCLUDED.final_reviewer_id,
      week = EXCLUDED.week,
      problem_doc = EXCLUDED.problem_doc,
      ground_truth = EXCLUDED.ground_truth,
      spec_folder = EXCLUDED.spec_folder,
      spec_doc = EXCLUDED.spec_doc,
      spec_data_folder = EXCLUDED.spec_data_folder,
      docker_container = EXCLUDED.docker_container,
      pr_link = EXCLUDED.pr_link,
      blocker_reason = EXCLUDED.blocker_reason,
      sonnet_pass_rate = EXCLUDED.sonnet_pass_rate,
      opus_pass_rate = EXCLUDED.opus_pass_rate,
      separate_environment_init = EXCLUDED.separate_environment_init,
      taiga_tag = EXCLUDED.taiga_tag,
      explainer_video = EXCLUDED.explainer_video,
      task_description = EXCLUDED.task_description,
      notes = EXCLUDED.notes,
      updated_at = NOW()
  `, [
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
    problem.notes ?? null,
  ]);
}

// ============================================
// BONUS OPERATIONS (Pay Period Based)
// ============================================

export interface PayPeriod {
  id: number;
  periodName: string;
  periodStart: Date;
  periodEnd: Date;
  isPaid: boolean;
  paidDate: Date | null;
  notes: string | null;
}

export async function getBonusParameters(): Promise<BonusParameters> {
  const rows = await query<{ parameter_name: string; parameter_value: number }>(
    'SELECT parameter_name, parameter_value FROM bonus_parameters'
  );

  const params: BonusParameters = {
    writerPerProblem: 100,
    review1PerProblem: 50,
    review2PerProblem: 30,
    hoursPercentRate: 0.20,
    referralBonusAmount: 300,
    defaultDataFilePrice: 50,
  };

  for (const row of rows) {
    switch (row.parameter_name) {
      case 'writer_per_problem': params.writerPerProblem = row.parameter_value; break;
      case 'review1_per_problem': params.review1PerProblem = row.parameter_value; break;
      case 'review2_per_problem': params.review2PerProblem = row.parameter_value; break;
      case 'hours_percent_rate': params.hoursPercentRate = row.parameter_value; break;
      case 'referral_bonus_amount': params.referralBonusAmount = row.parameter_value; break;
      case 'default_data_file_price': params.defaultDataFilePrice = row.parameter_value; break;
    }
  }

  return params;
}

export async function getAllPayPeriods(): Promise<PayPeriod[]> {
  return query<PayPeriod>(`
    SELECT
      id,
      period_name as "periodName",
      period_start as "periodStart",
      period_end as "periodEnd",
      is_paid as "isPaid",
      paid_date as "paidDate",
      notes
    FROM pay_periods
    ORDER BY period_start DESC
  `);
}

export async function getPayPeriodById(id: number): Promise<PayPeriod | null> {
  return queryOne<PayPeriod>(`
    SELECT
      id,
      period_name as "periodName",
      period_start as "periodStart",
      period_end as "periodEnd",
      is_paid as "isPaid",
      paid_date as "paidDate",
      notes
    FROM pay_periods
    WHERE id = $1
  `, [id]);
}

export async function createPayPeriod(periodName: string, periodStart: Date, periodEnd: Date): Promise<PayPeriod> {
  const result = await queryOne<PayPeriod>(`
    INSERT INTO pay_periods (period_name, period_start, period_end)
    VALUES ($1, $2, $3)
    ON CONFLICT (period_start, period_end) DO UPDATE SET period_name = EXCLUDED.period_name
    RETURNING id, period_name as "periodName", period_start as "periodStart", period_end as "periodEnd", is_paid as "isPaid", paid_date as "paidDate", notes
  `, [periodName, periodStart, periodEnd]);
  return result!;
}

export async function getExpertBonusConfig(expertId: number): Promise<ExpertBonusConfig | null> {
  return queryOne<ExpertBonusConfig>(`
    SELECT
      id,
      expert_id as "expertId",
      expert_code as "expertCode",
      start_date as "startDate",
      base_rate as "baseRate",
      current_rate as "currentRate",
      rate_effective_date as "rateEffectiveDate",
      is_20_percent_eligible as "is20PercentEligible",
      is_active as "isActive",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM expert_bonus_config
    WHERE expert_id = $1
  `, [expertId]);
}

export async function upsertWeeklyBonusInput(input: {
  expertId: number;
  periodId: number;
  totalHours?: number;
  hourlyRate?: number;
  writerQualifyingProblems?: number;
  review1QualifyingProblems?: number;
  review2QualifyingProblems?: number;
  is20PercentEligible?: boolean;
  hoursAtOldSalary?: number;
  oldHourlyRate?: number;
  newHourlyRate?: number;
  initialReferralCount?: number;
  dataFilesCount?: number;
}): Promise<void> {
  await query(`
    INSERT INTO weekly_bonus_input (
      expert_id, period_id, total_hours, hourly_rate,
      writer_qualifying_problems, review1_qualifying_problems, review2_qualifying_problems,
      is_20_percent_eligible, hours_at_old_salary, old_hourly_rate, new_hourly_rate,
      initial_referral_count, data_files_count
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (expert_id, period_id) DO UPDATE SET
      total_hours = EXCLUDED.total_hours,
      hourly_rate = EXCLUDED.hourly_rate,
      writer_qualifying_problems = EXCLUDED.writer_qualifying_problems,
      review1_qualifying_problems = EXCLUDED.review1_qualifying_problems,
      review2_qualifying_problems = EXCLUDED.review2_qualifying_problems,
      is_20_percent_eligible = EXCLUDED.is_20_percent_eligible,
      hours_at_old_salary = EXCLUDED.hours_at_old_salary,
      old_hourly_rate = EXCLUDED.old_hourly_rate,
      new_hourly_rate = EXCLUDED.new_hourly_rate,
      initial_referral_count = EXCLUDED.initial_referral_count,
      data_files_count = EXCLUDED.data_files_count,
      updated_at = NOW()
  `, [
    input.expertId,
    input.periodId,
    input.totalHours ?? 0,
    input.hourlyRate ?? 150,
    input.writerQualifyingProblems ?? 0,
    input.review1QualifyingProblems ?? 0,
    input.review2QualifyingProblems ?? 0,
    input.is20PercentEligible ?? false,
    input.hoursAtOldSalary ?? 0,
    input.oldHourlyRate ?? null,
    input.newHourlyRate ?? null,
    input.initialReferralCount ?? 0,
    input.dataFilesCount ?? 0,
  ]);
}

export async function calculateAndSaveBonus(expertId: number, periodId: number): Promise<WeeklyBonusCalculation | null> {
  // Get input data
  const input = await queryOne<any>(`
    SELECT * FROM weekly_bonus_input WHERE expert_id = $1 AND period_id = $2
  `, [expertId, periodId]);

  if (!input) return null;

  // Get bonus parameters
  const params = await getBonusParameters();

  // Calculate each bonus type
  const writerBonus = (input.writer_qualifying_problems || 0) * params.writerPerProblem;
  const review1Bonus = (input.review1_qualifying_problems || 0) * params.review1PerProblem;
  const review2Bonus = (input.review2_qualifying_problems || 0) * params.review2PerProblem;

  const baseEarnings = (input.total_hours || 0) * (input.hourly_rate || 150);
  const hoursPercentageBonus = input.is_20_percent_eligible
    ? baseEarnings * params.hoursPercentRate
    : 0;

  const salaryIncreaseBonus = (input.hours_at_old_salary || 0) > 0 && input.old_hourly_rate && input.new_hourly_rate
    ? (input.hours_at_old_salary || 0) * ((input.new_hourly_rate || 0) - (input.old_hourly_rate || 0))
    : 0;

  const referralBonus = (input.initial_referral_count || 0) * params.referralBonusAmount;
  const dataBonus = (input.data_files_count || 0) * params.defaultDataFilePrice;

  const totalBonus = writerBonus + review1Bonus + review2Bonus + hoursPercentageBonus + salaryIncreaseBonus + referralBonus + dataBonus;
  const totalOwed = baseEarnings + totalBonus;

  // Save calculation
  const result = await queryOne<WeeklyBonusCalculation>(`
    INSERT INTO weekly_bonus_calculations (
      expert_id, period_id, base_earnings,
      writer_bonus, review1_bonus, review2_bonus,
      hours_percentage_bonus, salary_increase_bonus, referral_bonus, data_bonus,
      total_bonus, total_owed
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (expert_id, period_id) DO UPDATE SET
      base_earnings = EXCLUDED.base_earnings,
      writer_bonus = EXCLUDED.writer_bonus,
      review1_bonus = EXCLUDED.review1_bonus,
      review2_bonus = EXCLUDED.review2_bonus,
      hours_percentage_bonus = EXCLUDED.hours_percentage_bonus,
      salary_increase_bonus = EXCLUDED.salary_increase_bonus,
      referral_bonus = EXCLUDED.referral_bonus,
      data_bonus = EXCLUDED.data_bonus,
      total_bonus = EXCLUDED.total_bonus,
      total_owed = EXCLUDED.total_owed,
      updated_at = NOW()
    RETURNING *
  `, [
    expertId, periodId, baseEarnings,
    writerBonus, review1Bonus, review2Bonus,
    hoursPercentageBonus, salaryIncreaseBonus, referralBonus, dataBonus,
    totalBonus, totalOwed,
  ]);

  return result;
}

export async function getBonusesByPeriod(periodId: number): Promise<ExpertBonusSummary[]> {
  return query<ExpertBonusSummary>(`
    SELECT
      e.id as "expertId",
      e.name as "expertName",
      p.period_name as "periodName",
      p.period_start as "periodStart",
      p.period_end as "periodEnd",
      COALESCE(wbi.writer_qualifying_problems, 0) as "writerQualifyingProblems",
      COALESCE(wbi.review1_qualifying_problems, 0) as "review1QualifyingProblems",
      COALESCE(wbi.review2_qualifying_problems, 0) as "review2QualifyingProblems",
      COALESCE(wbi.total_hours, 0) as "totalHours",
      COALESCE(wbi.hours_at_old_salary, 0) as "hoursAtOldSalary",
      COALESCE(wbi.initial_referral_count, 0) as "initialReferralCount",
      COALESCE(wbi.data_files_count, 0) as "dataFilesCount",
      COALESCE(wbc.writer_bonus, 0) as "writerBonus",
      COALESCE(wbc.review1_bonus, 0) as "review1Bonus",
      COALESCE(wbc.review2_bonus, 0) as "review2Bonus",
      COALESCE(wbc.hours_percentage_bonus, 0) as "hoursPercentageBonus",
      COALESCE(wbc.salary_increase_bonus, 0) as "salaryIncreaseBonus",
      COALESCE(wbc.referral_bonus, 0) as "referralBonus",
      COALESCE(wbc.data_bonus, 0) as "dataBonus",
      COALESCE(wbc.total_bonus, 0) as "totalBonus",
      COALESCE(wbc.base_earnings, 0) as "baseEarnings",
      COALESCE(wbc.total_owed, 0) as "totalOwed",
      COALESCE(wbc.is_paid, false) as "isPaid"
    FROM experts e
    JOIN pay_periods p ON p.id = $1
    LEFT JOIN weekly_bonus_input wbi ON e.id = wbi.expert_id AND wbi.period_id = $1
    LEFT JOIN weekly_bonus_calculations wbc ON e.id = wbc.expert_id AND wbc.period_id = $1
    WHERE wbc.total_owed > 0
    ORDER BY wbc.total_owed DESC
  `, [periodId]);
}

export async function getTotalOwedByExpert(): Promise<ExpertBonusSummary[]> {
  return query<ExpertBonusSummary>(`
    SELECT
      e.id as "expertId",
      e.name as "expertName",
      'All Periods' as "periodName",
      MIN(p.period_start) as "periodStart",
      MAX(p.period_end) as "periodEnd",
      COALESCE(SUM(wbi.writer_qualifying_problems), 0)::int as "writerQualifyingProblems",
      COALESCE(SUM(wbi.review1_qualifying_problems), 0)::int as "review1QualifyingProblems",
      COALESCE(SUM(wbi.review2_qualifying_problems), 0)::int as "review2QualifyingProblems",
      COALESCE(SUM(wbi.total_hours), 0) as "totalHours",
      COALESCE(SUM(wbi.hours_at_old_salary), 0) as "hoursAtOldSalary",
      COALESCE(SUM(wbi.initial_referral_count), 0)::int as "initialReferralCount",
      COALESCE(SUM(wbi.data_files_count), 0)::int as "dataFilesCount",
      COALESCE(SUM(wbc.writer_bonus), 0) as "writerBonus",
      COALESCE(SUM(wbc.review1_bonus), 0) as "review1Bonus",
      COALESCE(SUM(wbc.review2_bonus), 0) as "review2Bonus",
      COALESCE(SUM(wbc.hours_percentage_bonus), 0) as "hoursPercentageBonus",
      COALESCE(SUM(wbc.salary_increase_bonus), 0) as "salaryIncreaseBonus",
      COALESCE(SUM(wbc.referral_bonus), 0) as "referralBonus",
      COALESCE(SUM(wbc.data_bonus), 0) as "dataBonus",
      COALESCE(SUM(wbc.total_bonus), 0) as "totalBonus",
      COALESCE(SUM(wbc.base_earnings), 0) as "baseEarnings",
      COALESCE(SUM(wbc.total_owed), 0) as "totalOwed",
      BOOL_AND(COALESCE(wbc.is_paid, true)) as "isPaid"
    FROM experts e
    JOIN weekly_bonus_calculations wbc ON e.id = wbc.expert_id
    JOIN weekly_bonus_input wbi ON e.id = wbi.expert_id AND wbi.period_id = wbc.period_id
    JOIN pay_periods p ON p.id = wbc.period_id
    GROUP BY e.id, e.name
    HAVING COALESCE(SUM(wbc.total_owed), 0) > 0
    ORDER BY "totalOwed" DESC
  `);
}

export async function getUnpaidBonusByExpert(): Promise<ExpertBonusSummary[]> {
  return query<ExpertBonusSummary>(`
    SELECT
      e.id as "expertId",
      e.name as "expertName",
      'Unpaid Periods' as "periodName",
      MIN(p.period_start) as "periodStart",
      MAX(p.period_end) as "periodEnd",
      COALESCE(SUM(wbi.writer_qualifying_problems), 0)::int as "writerQualifyingProblems",
      COALESCE(SUM(wbi.review1_qualifying_problems), 0)::int as "review1QualifyingProblems",
      COALESCE(SUM(wbi.review2_qualifying_problems), 0)::int as "review2QualifyingProblems",
      COALESCE(SUM(wbi.total_hours), 0) as "totalHours",
      COALESCE(SUM(wbi.hours_at_old_salary), 0) as "hoursAtOldSalary",
      COALESCE(SUM(wbi.initial_referral_count), 0)::int as "initialReferralCount",
      COALESCE(SUM(wbi.data_files_count), 0)::int as "dataFilesCount",
      COALESCE(SUM(wbc.writer_bonus), 0) as "writerBonus",
      COALESCE(SUM(wbc.review1_bonus), 0) as "review1Bonus",
      COALESCE(SUM(wbc.review2_bonus), 0) as "review2Bonus",
      COALESCE(SUM(wbc.hours_percentage_bonus), 0) as "hoursPercentageBonus",
      COALESCE(SUM(wbc.salary_increase_bonus), 0) as "salaryIncreaseBonus",
      COALESCE(SUM(wbc.referral_bonus), 0) as "referralBonus",
      COALESCE(SUM(wbc.data_bonus), 0) as "dataBonus",
      COALESCE(SUM(wbc.total_bonus), 0) as "totalBonus",
      COALESCE(SUM(wbc.base_earnings), 0) as "baseEarnings",
      COALESCE(SUM(wbc.total_owed), 0) as "totalOwed",
      false as "isPaid"
    FROM experts e
    JOIN weekly_bonus_calculations wbc ON e.id = wbc.expert_id AND wbc.is_paid = false
    JOIN weekly_bonus_input wbi ON e.id = wbi.expert_id AND wbi.period_id = wbc.period_id
    JOIN pay_periods p ON p.id = wbc.period_id
    GROUP BY e.id, e.name
    HAVING COALESCE(SUM(wbc.total_owed), 0) > 0
    ORDER BY "totalOwed" DESC
  `);
}

export async function getAllBonusPeriods(): Promise<{ periodName: string; periodStart: Date; periodEnd: Date }[]> {
  return query<{ periodName: string; periodStart: Date; periodEnd: Date }>(`
    SELECT
      period_name as "periodName",
      period_start as "periodStart",
      period_end as "periodEnd"
    FROM pay_periods
    ORDER BY period_start DESC
  `);
}

export async function markPeriodPaid(periodId: number, notes?: string): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(`
      UPDATE weekly_bonus_calculations
      SET is_paid = true, paid_date = NOW(), updated_at = NOW()
      WHERE period_id = $1
    `, [periodId]);

    await client.query(`
      UPDATE pay_periods
      SET is_paid = true, paid_date = NOW(), notes = COALESCE($2, notes)
      WHERE id = $1
    `, [periodId, notes ?? null]);
  });
}

export async function markExpertPeriodPaid(expertId: number, periodId: number, notes?: string): Promise<void> {
  await query(`
    UPDATE weekly_bonus_calculations
    SET is_paid = true, paid_date = NOW(), updated_at = NOW()
    WHERE expert_id = $1 AND period_id = $2
  `, [expertId, periodId]);
}

// ============================================
// SYNC/ERROR TRACKING
// ============================================

export async function startSyncRun(source: string): Promise<number> {
  const result = await queryOne<{ id: number }>(`
    INSERT INTO sync_runs (source) VALUES ($1) RETURNING id
  `, [source]);
  return result!.id;
}

export async function completeSyncRun(
  id: number,
  status: 'success' | 'partial' | 'failed',
  stats: { processed: number; created: number; updated: number; errors: number },
  errorSummary?: Record<string, any>
): Promise<void> {
  await query(`
    UPDATE sync_runs SET
      completed_at = NOW(),
      status = $2,
      records_processed = $3,
      records_created = $4,
      records_updated = $5,
      errors_count = $6,
      error_summary = $7
    WHERE id = $1
  `, [id, status, stats.processed, stats.created, stats.updated, stats.errors, errorSummary ? JSON.stringify(errorSummary) : null]);
}

export async function logSyncError(
  syncRunId: number,
  errorType: string,
  severity: 'warning' | 'error' | 'critical',
  errorMessage: string,
  sourceRecord?: Record<string, any>,
  stackTrace?: string
): Promise<void> {
  await query(`
    INSERT INTO sync_errors (sync_run_id, error_type, severity, error_message, source_record, stack_trace)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [syncRunId, errorType, severity, errorMessage, sourceRecord ? JSON.stringify(sourceRecord) : null, stackTrace ?? null]);
}

export async function getRecentSyncRuns(limit: number = 10): Promise<SyncRun[]> {
  return query<SyncRun>(`
    SELECT
      id,
      source,
      started_at as "startedAt",
      completed_at as "completedAt",
      status,
      records_processed as "recordsProcessed",
      records_created as "recordsCreated",
      records_updated as "recordsUpdated",
      errors_count as "errorsCount",
      error_summary as "errorSummary"
    FROM sync_runs
    ORDER BY started_at DESC
    LIMIT $1
  `, [limit]);
}

export async function getSyncErrors(syncRunId: number): Promise<SyncError[]> {
  return query<SyncError>(`
    SELECT
      id,
      sync_run_id as "syncRunId",
      error_type as "errorType",
      severity,
      source_record as "sourceRecord",
      error_message as "errorMessage",
      stack_trace as "stackTrace",
      created_at as "createdAt",
      resolved_at as "resolvedAt",
      resolved_by as "resolvedBy"
    FROM sync_errors
    WHERE sync_run_id = $1
    ORDER BY created_at DESC
  `, [syncRunId]);
}

// ============================================
// STATUS/TOTALS
// ============================================

export async function getProblemTotals(): Promise<{ totalProblems: number; inProgress: number; delivered: number }> {
  const result = await queryOne<{ totalProblems: number; inProgress: number; delivered: number }>(`
    SELECT
      COUNT(*) as "totalProblems",
      SUM(CASE WHEN status IN ('Problem Writeup', 'Problem Feedback', 'Problem QA', 'Feedback Requested') THEN 1 ELSE 0 END) as "inProgress",
      SUM(CASE WHEN status NOT IN ('Problem Writeup', 'Problem Feedback', 'Problem QA', 'Feedback Requested') THEN 1 ELSE 0 END) as "delivered"
    FROM problems
  `);
  return result ?? { totalProblems: 0, inProgress: 0, delivered: 0 };
}

export async function getStatusCounts(environment?: 'PE' | 'IB'): Promise<Record<string, number>> {
  let sql = 'SELECT status, COUNT(*) as count FROM problems';
  const params: any[] = [];

  if (environment) {
    sql += ' WHERE environment = $1';
    params.push(environment);
  }
  sql += ' GROUP BY status';

  const rows = await query<{ status: string; count: number }>(sql, params);

  return rows.reduce((acc, row) => {
    acc[row.status] = Number(row.count);
    return acc;
  }, {} as Record<string, number>);
}

// ============================================
// TIMECARD OPERATIONS
// ============================================

export interface Timecard {
  id: number;
  expertId: number | null;
  employeeName: string;
  periodId: number | null;
  periodStart: Date;
  periodEnd: Date;
  status: string;
  hoursRegular: number;
  hoursApproved: number;
  hoursTotal: number;
  alerts: number;
  timeOffPtoPaid: number;
  timeOffPtoUnpaid: number;
  holidaysPaid: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimecardRow {
  employeeName: string;
  approvalStatus: string;
  designatedApprover: string;
  alerts: number;
  status: string;
  hoursRegular: number;
  approvedTotal: string;
  timeOffPtoPaid: number;
  timeOffPtoUnpaid: number;
  holidaysPaid: number;
}

export async function upsertTimecard(timecard: {
  employeeName: string;
  periodStart: Date;
  periodEnd: Date;
  status: string;
  hoursRegular: number;
  hoursApproved: number;
  hoursTotal: number;
  alerts?: number;
  timeOffPtoPaid?: number;
  timeOffPtoUnpaid?: number;
  holidaysPaid?: number;
}): Promise<Timecard> {
  // Try to match expert by name
  const expert = await getExpertByName(timecard.employeeName);

  // Try to find matching pay period
  const period = await queryOne<{ id: number }>(`
    SELECT id FROM pay_periods
    WHERE period_start = $1 AND period_end = $2
  `, [timecard.periodStart, timecard.periodEnd]);

  const result = await queryOne<Timecard>(`
    INSERT INTO timecards (
      expert_id, employee_name, period_id, period_start, period_end,
      status, hours_regular, hours_approved, hours_total, alerts,
      time_off_pto_paid, time_off_pto_unpaid, holidays_paid
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (employee_name, period_start, period_end) DO UPDATE SET
      expert_id = COALESCE($1, timecards.expert_id),
      period_id = COALESCE($3, timecards.period_id),
      status = $6,
      hours_regular = $7,
      hours_approved = $8,
      hours_total = $9,
      alerts = $10,
      time_off_pto_paid = $11,
      time_off_pto_unpaid = $12,
      holidays_paid = $13,
      updated_at = NOW()
    RETURNING
      id, expert_id as "expertId", employee_name as "employeeName",
      period_id as "periodId", period_start as "periodStart", period_end as "periodEnd",
      status, hours_regular as "hoursRegular", hours_approved as "hoursApproved",
      hours_total as "hoursTotal", alerts,
      time_off_pto_paid as "timeOffPtoPaid", time_off_pto_unpaid as "timeOffPtoUnpaid",
      holidays_paid as "holidaysPaid", created_at as "createdAt", updated_at as "updatedAt"
  `, [
    expert?.id ?? null,
    timecard.employeeName,
    period?.id ?? null,
    timecard.periodStart,
    timecard.periodEnd,
    timecard.status,
    timecard.hoursRegular,
    timecard.hoursApproved,
    timecard.hoursTotal,
    timecard.alerts ?? 0,
    timecard.timeOffPtoPaid ?? 0,
    timecard.timeOffPtoUnpaid ?? 0,
    timecard.holidaysPaid ?? 0,
  ]);

  return result!;
}

export async function getTimecardsByPeriod(periodStart: Date, periodEnd: Date): Promise<Timecard[]> {
  return query<Timecard>(`
    SELECT
      id, expert_id as "expertId", employee_name as "employeeName",
      period_id as "periodId", period_start as "periodStart", period_end as "periodEnd",
      status, hours_regular as "hoursRegular", hours_approved as "hoursApproved",
      hours_total as "hoursTotal", alerts,
      time_off_pto_paid as "timeOffPtoPaid", time_off_pto_unpaid as "timeOffPtoUnpaid",
      holidays_paid as "holidaysPaid", created_at as "createdAt", updated_at as "updatedAt"
    FROM timecards
    WHERE period_start = $1 AND period_end = $2
    ORDER BY hours_regular DESC
  `, [periodStart, periodEnd]);
}

export async function getLatestTimecards(): Promise<Timecard[]> {
  return query<Timecard>(`
    SELECT
      id, expert_id as "expertId", employee_name as "employeeName",
      period_id as "periodId", period_start as "periodStart", period_end as "periodEnd",
      status, hours_regular as "hoursRegular", hours_approved as "hoursApproved",
      hours_total as "hoursTotal", alerts,
      time_off_pto_paid as "timeOffPtoPaid", time_off_pto_unpaid as "timeOffPtoUnpaid",
      holidays_paid as "holidaysPaid", created_at as "createdAt", updated_at as "updatedAt"
    FROM timecards
    WHERE (period_start, period_end) = (
      SELECT period_start, period_end FROM timecards ORDER BY period_end DESC LIMIT 1
    )
    ORDER BY hours_regular DESC
  `);
}

export async function getTimecardPeriods(): Promise<{ periodStart: Date; periodEnd: Date; count: number }[]> {
  return query<{ periodStart: Date; periodEnd: Date; count: number }>(`
    SELECT
      period_start as "periodStart",
      period_end as "periodEnd",
      COUNT(*) as count
    FROM timecards
    GROUP BY period_start, period_end
    ORDER BY period_end DESC
  `);
}
