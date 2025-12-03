import { NextResponse } from 'next/server';
import { getExpertProblemBreakdown } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const expertId = parseInt(id, 10);

  if (isNaN(expertId)) {
    return NextResponse.json({ error: 'Invalid expert ID' }, { status: 400 });
  }

  const breakdown = getExpertProblemBreakdown(expertId);

  return NextResponse.json({ breakdown });
}
