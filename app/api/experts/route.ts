import { NextResponse } from 'next/server';
import { getExpertSummaries, getStatusCounts, getProblemTotals } from '@/lib/db';

export async function GET() {
  try {
    const [summaries, statusCounts, problemTotals] = await Promise.all([
      getExpertSummaries(),
      getStatusCounts(),
      getProblemTotals(),
    ]);

    return NextResponse.json({
      experts: summaries,
      statusCounts,
      totals: {
        totalExperts: summaries.length,
        totalHours: summaries.reduce((sum, e) => sum + Number(e.totalHours || 0), 0),
        totalCost: summaries.reduce((sum, e) => sum + Number(e.totalCost || 0), 0),
        totalProblems: problemTotals.totalProblems,
        totalProblemsDelivered: problemTotals.delivered,
        totalProblemsInProgress: problemTotals.inProgress,
      },
    });
  } catch (error) {
    console.error('Error fetching experts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch experts', details: String(error) },
      { status: 500 }
    );
  }
}
