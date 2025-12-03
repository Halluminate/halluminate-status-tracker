import { NextResponse } from 'next/server';
import { getExpertSummaries, getStatusCounts, getProblemTotals } from '@/lib/db';

export async function GET() {
  const summaries = getExpertSummaries();
  const statusCounts = getStatusCounts();
  const problemTotals = getProblemTotals();

  return NextResponse.json({
    experts: summaries,
    statusCounts,
    totals: {
      totalExperts: summaries.length,
      totalHours: summaries.reduce((sum, e) => sum + e.totalHours, 0),
      totalCost: summaries.reduce((sum, e) => sum + e.totalCost, 0),
      totalProblems: problemTotals.totalProblems,
      totalProblemsDelivered: problemTotals.delivered,
      totalProblemsInProgress: problemTotals.inProgress,
    },
  });
}
