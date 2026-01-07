import { NextResponse } from 'next/server';
import { getAllHorizonUsers } from '@/lib/horizon/s3-client';
import { autoMatchHorizonUsers, upsertExpertFromRippling } from '@/lib/db/operations';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { createMissing = false } = body;

    // Get all Horizon users
    const horizonUsers = await getAllHorizonUsers();

    // Auto-match with existing experts
    const { matched, unmatched } = await autoMatchHorizonUsers(horizonUsers);

    // Optionally create experts for unmatched Horizon users
    let created = 0;
    if (createMissing && unmatched.length > 0) {
      for (const name of unmatched) {
        await upsertExpertFromRippling(name);
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      horizonUsersFound: horizonUsers.length,
      matched,
      unmatched: createMissing ? [] : unmatched,
      created,
    });
  } catch (error) {
    console.error('Error syncing Horizon users:', error);
    return NextResponse.json(
      { error: 'Failed to sync Horizon users', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get all Horizon users for preview
    const horizonUsers = await getAllHorizonUsers();

    return NextResponse.json({
      horizonUsers: horizonUsers.map(u => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        firstName: u.firstName,
        lastName: u.lastName,
      })),
      total: horizonUsers.length,
    });
  } catch (error) {
    console.error('Error fetching Horizon users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Horizon users', details: String(error) },
      { status: 500 }
    );
  }
}
