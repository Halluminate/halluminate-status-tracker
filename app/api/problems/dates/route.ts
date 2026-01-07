import { NextResponse } from 'next/server';
import { getAllProblemsWithDates } from '@/lib/horizon/s3-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const problems = await getAllProblemsWithDates();

    return NextResponse.json({
      problems,
      total: problems.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching problem dates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch problem dates', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
