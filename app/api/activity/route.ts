import { NextResponse } from 'next/server';
import { getActivityByExpert } from '@/lib/horizon/s3-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get activity stats per expert
    const activityStats = await getActivityByExpert();

    // Convert to array and sort by activity count
    const experts = Array.from(activityStats.values())
      .sort((a, b) => b.activityCount - a.activityCount);

    return NextResponse.json({
      experts,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
