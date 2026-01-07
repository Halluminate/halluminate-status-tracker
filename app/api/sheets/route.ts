import { NextResponse } from 'next/server';
import { fetchAllFromHorizon } from '@/lib/horizon/status-fetcher';
import { CombinedData } from '@/types/status';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch data from Horizon (AWS S3) instead of Google Sheets
    const { sheets, expertSheets } = await fetchAllFromHorizon();

    const data: CombinedData = {
      sheets,
      expertSheets,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching from Horizon:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Horizon data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
