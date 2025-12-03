import { NextResponse } from 'next/server';
import { fetchAllSheets } from '@/lib/sheets/status-fetcher';
import { CombinedData } from '@/types/status';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { sheets, expertSheets } = await fetchAllSheets();

    const data: CombinedData = {
      sheets,
      expertSheets,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching sheets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sheets data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
