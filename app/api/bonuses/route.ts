import { NextResponse } from 'next/server';
import {
  getTotalOwedByExpert,
  getUnpaidBonusByExpert,
  getBonusesByPeriod,
  getAllPayPeriods,
  getBonusParameters,
  upsertWeeklyBonusInput,
  calculateAndSaveBonus,
  createPayPeriod,
} from '@/lib/db/operations';
import type { ExpertBonusSummary } from '@/types/bonuses';

interface BonusTotals {
  writerBonus: number;
  review1Bonus: number;
  review2Bonus: number;
  hoursPercentageBonus: number;
  salaryIncreaseBonus: number;
  referralBonus: number;
  dataBonus: number;
  totalBonus: number;
  baseEarnings: number;
  totalOwed: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'unpaid';
    const periodId = searchParams.get('periodId');

    const [parameters, periods] = await Promise.all([
      getBonusParameters(),
      getAllPayPeriods(),
    ]);

    let experts: ExpertBonusSummary[];

    if (periodId && periodId !== 'all') {
      // Get bonuses for specific period
      experts = await getBonusesByPeriod(Number(periodId));
    } else if (view === 'all') {
      experts = await getTotalOwedByExpert();
    } else {
      experts = await getUnpaidBonusByExpert();
    }

    // Calculate totals
    const totals = experts.reduce<BonusTotals>(
      (acc: BonusTotals, expert: ExpertBonusSummary) => ({
        writerBonus: acc.writerBonus + Number(expert.writerBonus || 0),
        review1Bonus: acc.review1Bonus + Number(expert.review1Bonus || 0),
        review2Bonus: acc.review2Bonus + Number(expert.review2Bonus || 0),
        hoursPercentageBonus: acc.hoursPercentageBonus + Number(expert.hoursPercentageBonus || 0),
        salaryIncreaseBonus: acc.salaryIncreaseBonus + Number(expert.salaryIncreaseBonus || 0),
        referralBonus: acc.referralBonus + Number(expert.referralBonus || 0),
        dataBonus: acc.dataBonus + Number(expert.dataBonus || 0),
        totalBonus: acc.totalBonus + Number(expert.totalBonus || 0),
        baseEarnings: acc.baseEarnings + Number(expert.baseEarnings || 0),
        totalOwed: acc.totalOwed + Number(expert.totalOwed || 0),
      }),
      {
        writerBonus: 0,
        review1Bonus: 0,
        review2Bonus: 0,
        hoursPercentageBonus: 0,
        salaryIncreaseBonus: 0,
        referralBonus: 0,
        dataBonus: 0,
        totalBonus: 0,
        baseEarnings: 0,
        totalOwed: 0,
      }
    );

    return NextResponse.json({
      experts,
      periods,
      parameters,
      totals,
      view,
      selectedPeriodId: periodId ? Number(periodId) : null,
    });
  } catch (error) {
    console.error('Error fetching bonus data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bonus data', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      expertId,
      periodId,
      periodName,
      periodStart,
      periodEnd,
      writerQualifyingProblems,
      review1QualifyingProblems,
      review2QualifyingProblems,
      totalHours,
      hourlyRate,
      is20PercentEligible,
      hoursAtOldSalary,
      oldHourlyRate,
      newHourlyRate,
      initialReferralCount,
      dataFilesCount,
      notes,
    } = body;

    // Validate required fields
    if (!expertId) {
      return NextResponse.json(
        { error: 'Missing required field: expertId' },
        { status: 400 }
      );
    }

    let targetPeriodId = periodId;

    // If no periodId, create/get period from dates
    if (!targetPeriodId && periodStart && periodEnd) {
      const period = await createPayPeriod(
        periodName || `${periodStart} - ${periodEnd}`,
        new Date(periodStart),
        new Date(periodEnd)
      );
      targetPeriodId = period.id;
    }

    if (!targetPeriodId) {
      return NextResponse.json(
        { error: 'Missing required field: periodId or (periodStart and periodEnd)' },
        { status: 400 }
      );
    }

    // Insert bonus input
    await upsertWeeklyBonusInput({
      expertId: Number(expertId),
      periodId: Number(targetPeriodId),
      totalHours: Number(totalHours) || 0,
      hourlyRate: Number(hourlyRate) || 150,
      writerQualifyingProblems: Number(writerQualifyingProblems) || 0,
      review1QualifyingProblems: Number(review1QualifyingProblems) || 0,
      review2QualifyingProblems: Number(review2QualifyingProblems) || 0,
      is20PercentEligible: is20PercentEligible === true || is20PercentEligible === 'true',
      hoursAtOldSalary: Number(hoursAtOldSalary) || 0,
      oldHourlyRate: oldHourlyRate ? Number(oldHourlyRate) : undefined,
      newHourlyRate: newHourlyRate ? Number(newHourlyRate) : undefined,
      initialReferralCount: Number(initialReferralCount) || 0,
      dataFilesCount: Number(dataFilesCount) || 0,
      notes: notes || undefined,
    });

    // Calculate and save the bonus
    const result = await calculateAndSaveBonus(
      Number(expertId),
      Number(targetPeriodId)
    );

    return NextResponse.json({ success: true, calculation: result });
  } catch (error) {
    console.error('Error adding bonus:', error);
    return NextResponse.json(
      { error: 'Failed to add bonus', details: String(error) },
      { status: 500 }
    );
  }
}
