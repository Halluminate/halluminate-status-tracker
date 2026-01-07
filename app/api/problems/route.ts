import { NextRequest, NextResponse } from 'next/server';
import { getAllProblems, getStatusCounts } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const environment = searchParams.get('environment') as 'PE' | 'IB' | null;

  const [problems, statusCounts] = await Promise.all([
    getAllProblems(environment ?? undefined),
    getStatusCounts(environment ?? undefined),
  ]);

  return NextResponse.json({
    problems,
    statusCounts,
    total: problems.length,
  });
}
