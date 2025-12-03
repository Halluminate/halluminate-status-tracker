import { NextResponse } from 'next/server';
import { syncAllSheets, syncPEProblems, syncIBProblems } from '@/lib/sheets/catalog-sync';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { environment } = body as { environment?: 'PE' | 'IB' | 'all' };

    let result;

    if (environment === 'PE') {
      const pe = await syncPEProblems();
      result = { pe, ib: null };
    } else if (environment === 'IB') {
      const ib = await syncIBProblems();
      result = { pe: null, ib };
    } else {
      result = await syncAllSheets();
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync from Google Sheets'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to sync data from Google Sheets',
    endpoints: {
      'POST /api/sync': 'Sync all sheets',
      'POST /api/sync { environment: "PE" }': 'Sync PE problems only',
      'POST /api/sync { environment: "IB" }': 'Sync IB problems only',
    },
  });
}
