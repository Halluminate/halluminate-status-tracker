import { NextResponse } from 'next/server';
import { getAllExperts } from '@/lib/db/operations';

export async function GET() {
  try {
    const experts = await getAllExperts();
    return NextResponse.json({ experts });
  } catch (error) {
    console.error('Error fetching experts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch experts', details: String(error) },
      { status: 500 }
    );
  }
}
