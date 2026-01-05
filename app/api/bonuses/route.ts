import { NextResponse } from 'next/server';
import {
  getTotalOwedByExpert,
  getUnpaidBonusByExpert,
  getAllBonusPeriods,
  getBonusParameters,
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

    const [parameters, periods] = await Promise.all([
      getBonusParameters(),
      getAllBonusPeriods(),
    ]);

    let experts;
    if (view === 'all') {
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
    });
  } catch (error) {
    console.error('Error fetching bonus data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bonus data', details: String(error) },
      { status: 500 }
    );
  }
}
