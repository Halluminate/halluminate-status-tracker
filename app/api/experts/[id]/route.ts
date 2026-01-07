import { NextResponse } from 'next/server';
import { getExpertSummaryById, getExpertById } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const expertId = parseInt(id, 10);

  if (isNaN(expertId)) {
    return NextResponse.json({ error: 'Invalid expert ID' }, { status: 400 });
  }

  const [expert, summary] = await Promise.all([
    getExpertById(expertId),
    getExpertSummaryById(expertId),
  ]);

  if (!expert) {
    return NextResponse.json({ error: 'Expert not found' }, { status: 404 });
  }

  return NextResponse.json({ expert, summary });
}
