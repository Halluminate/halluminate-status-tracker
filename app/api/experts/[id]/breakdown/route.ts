import { NextResponse } from 'next/server';
import { getProblemsByExpert } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const expertId = parseInt(id, 10);

  if (isNaN(expertId)) {
    return NextResponse.json({ error: 'Invalid expert ID' }, { status: 400 });
  }

  const problems = await getProblemsByExpert(expertId);

  // Group problems by status for breakdown
  const breakdown = problems.reduce((acc, problem) => {
    const status = problem.status || 'Unknown';
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(problem);
    return acc;
  }, {} as Record<string, typeof problems>);

  return NextResponse.json({ breakdown, problems });
}
