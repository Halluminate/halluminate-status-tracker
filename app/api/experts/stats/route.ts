import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAllProblemsWithDates, getActivityByExpert, getReviewsByExpert } from '@/lib/horizon/s3-client';

export const dynamic = 'force-dynamic';

// Role assignment based on expert name
function getRoleForExpert(name: string): string {
  const lowerName = name.toLowerCase();

  // Team Lead
  if (lowerName.includes('alex ishin')) {
    return 'Team Lead';
  }

  // Reviewers
  if (['phil', 'ryan', 'jackson'].some(n => lowerName.includes(n))) {
    return 'Reviewer';
  }

  // Senior Writers
  if (['arielle', 'haylee', 'jack barnett', 'justin'].some(n => lowerName.includes(n))) {
    return 'Senior Writer';
  }

  // Default
  return 'Writer';
}

interface ExpertStats {
  id: number;
  name: string;
  role: string;
  hourlyRate: number;
  horizonUserId: string | null;
  lastActiveDay: string | null;
  hoursThisWeek: number;
  hoursThisMonth: number;
  totalHours: number;
  problemsThisWeek: number;
  problemsThisMonth: number;
  totalProblems: number;
  reviewsThisWeek: number;
  reviewsThisMonth: number;
  totalReviews: number;
  pricePerProblem: number | null;
}

export async function GET() {
  try {
    // Get current date boundaries
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get all experts with their timecard hours
    // Exclude internal team members from the view
    const excludedNames = ['Wyatt', 'Robert', 'Will', 'Jerry'];
    const excludePattern = excludedNames.map(n => `name NOT ILIKE '%${n}%'`).join(' AND ');

    const experts = await query<{
      id: number;
      name: string;
      hourly_rate: number;
      horizon_user_id: string | null;
      source: string | null;
    }>(`
      SELECT id, name, hourly_rate, horizon_user_id, source
      FROM experts
      WHERE COALESCE(is_active, true) = true
        AND ${excludePattern}
      ORDER BY name
    `);

    // Get timecard data grouped by expert
    const timecardData = await query<{
      expert_id: number;
      employee_name: string;
      total_hours: number;
      hours_this_week: number;
      hours_this_month: number;
    }>(`
      SELECT
        e.id as expert_id,
        t.employee_name,
        COALESCE(SUM(t.hours_regular), 0) as total_hours,
        COALESCE(SUM(CASE
          WHEN t.period_end >= $1 THEN t.hours_regular
          ELSE 0
        END), 0) as hours_this_week,
        COALESCE(SUM(CASE
          WHEN t.period_end >= $2 THEN t.hours_regular
          ELSE 0
        END), 0) as hours_this_month
      FROM experts e
      LEFT JOIN timecards t ON e.id = t.expert_id OR LOWER(e.name) = LOWER(t.employee_name)
      GROUP BY e.id, t.employee_name
    `, [startOfWeek.toISOString(), startOfMonth.toISOString()]);

    // Create a map of expert hours
    const hoursMap = new Map<number, { total: number; week: number; month: number }>();
    for (const tc of timecardData) {
      if (tc.expert_id) {
        const existing = hoursMap.get(tc.expert_id) || { total: 0, week: 0, month: 0 };
        hoursMap.set(tc.expert_id, {
          total: existing.total + Number(tc.total_hours),
          week: existing.week + Number(tc.hours_this_week),
          month: existing.month + Number(tc.hours_this_month),
        });
      }
    }

    // Get Horizon problem data, activity, and reviews
    const [horizonProblems, activityStatsMap, reviewStatsMap] = await Promise.all([
      getAllProblemsWithDates(),
      getActivityByExpert(),
      getReviewsByExpert(),
    ]);

    // Create maps for problem counts and last active
    const problemsMap = new Map<string, { total: number; week: number; month: number }>();
    const lastActiveMap = new Map<string, string>();

    for (const problem of horizonProblems) {
      const expertKey = problem.expert.toLowerCase().replace(/\s+/g, '-');
      const existing = problemsMap.get(expertKey) || { total: 0, week: 0, month: 0 };

      existing.total++;

      const createdDate = new Date(problem.createdAt);
      if (createdDate >= startOfWeek) {
        existing.week++;
      }
      if (createdDate >= startOfMonth) {
        existing.month++;
      }

      problemsMap.set(expertKey, existing);
    }

    // Get last active from activity stats (activityStatsMap is a Map<string, ExpertActivityStats>)
    for (const [expertName, activity] of activityStatsMap) {
      const expertKey = expertName.toLowerCase().replace(/\s+/g, '-');
      if (activity.activeDates && activity.activeDates.length > 0) {
        // activeDates are already sorted in reverse chronological order
        lastActiveMap.set(expertKey, activity.activeDates[0]);
      }
    }

    // Build review stats map keyed by lowercase name
    const reviewsMap = new Map<string, { week: number; month: number; total: number }>();
    for (const [expertName, reviewStats] of reviewStatsMap) {
      const key = expertName.toLowerCase().replace(/\s+/g, '-');
      reviewsMap.set(key, {
        week: reviewStats.reviewsThisWeek,
        month: reviewStats.reviewsThisMonth,
        total: reviewStats.totalReviews,
      });
    }

    // Combine all data
    const expertStats: ExpertStats[] = experts.map(expert => {
      const horizonKey = expert.horizon_user_id || expert.name.toLowerCase().replace(/\s+/g, '-');
      const hours = hoursMap.get(expert.id) || { total: 0, week: 0, month: 0 };
      const problems = problemsMap.get(horizonKey) || { total: 0, week: 0, month: 0 };
      const reviews = reviewsMap.get(horizonKey) || { week: 0, month: 0, total: 0 };
      const lastActive = lastActiveMap.get(horizonKey) || null;

      const totalCost = hours.total * Number(expert.hourly_rate);
      const pricePerProblem = problems.total > 0 ? totalCost / problems.total : null;

      return {
        id: expert.id,
        name: expert.name,
        role: getRoleForExpert(expert.name),
        hourlyRate: Number(expert.hourly_rate),
        horizonUserId: expert.horizon_user_id,
        lastActiveDay: lastActive,
        hoursThisWeek: hours.week,
        hoursThisMonth: hours.month,
        totalHours: hours.total,
        problemsThisWeek: problems.week,
        problemsThisMonth: problems.month,
        totalProblems: problems.total,
        reviewsThisWeek: reviews.week,
        reviewsThisMonth: reviews.month,
        totalReviews: reviews.total,
        pricePerProblem,
      };
    });

    // Calculate totals
    const totals = expertStats.reduce((acc, e) => ({
      totalExperts: acc.totalExperts + 1,
      totalHours: acc.totalHours + e.totalHours,
      hoursThisWeek: acc.hoursThisWeek + e.hoursThisWeek,
      hoursThisMonth: acc.hoursThisMonth + e.hoursThisMonth,
      totalProblems: acc.totalProblems + e.totalProblems,
      problemsThisWeek: acc.problemsThisWeek + e.problemsThisWeek,
      problemsThisMonth: acc.problemsThisMonth + e.problemsThisMonth,
      totalReviews: acc.totalReviews + e.totalReviews,
      reviewsThisWeek: acc.reviewsThisWeek + e.reviewsThisWeek,
      reviewsThisMonth: acc.reviewsThisMonth + e.reviewsThisMonth,
    }), {
      totalExperts: 0,
      totalHours: 0,
      hoursThisWeek: 0,
      hoursThisMonth: 0,
      totalProblems: 0,
      problemsThisWeek: 0,
      problemsThisMonth: 0,
      totalReviews: 0,
      reviewsThisWeek: 0,
      reviewsThisMonth: 0,
    });

    // Get last Rippling sync time from most recent timecard update
    const lastSyncResult = await query<{ lastSync: string }>(`
      SELECT MAX(updated_at) as "lastSync" FROM timecards
    `);
    const lastRipplingSync = lastSyncResult[0]?.lastSync || null;

    // Calculate end of week (Saturday) for display
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return NextResponse.json({
      experts: expertStats,
      totals,
      metadata: {
        weekStart: startOfWeek.toISOString(),
        weekEnd: endOfWeek.toISOString(),
        monthStart: startOfMonth.toISOString(),
        monthEnd: now.toISOString(),
        lastRipplingSync,
      },
    });
  } catch (error) {
    console.error('Error fetching expert stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expert stats', details: String(error) },
      { status: 500 }
    );
  }
}
