import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import {
  importPEProblems,
  importIBProblems,
  parseRipplingTimeData,
  getCurrentWeekStart,
  initializeDatabase,
} from '@/lib/import';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, data, filePath, weekStart } = body;

  // Initialize the database
  initializeDatabase();

  if (type === 'pe-csv') {
    // Import PE problems from a file path
    if (!filePath || !fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 400 });
    }
    const result = await importPEProblems(filePath);
    return NextResponse.json(result);
  }

  if (type === 'ib-csv') {
    // Import IB problems from a file path
    if (!filePath || !fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 400 });
    }
    const result = await importIBProblems(filePath);
    return NextResponse.json(result);
  }

  if (type === 'rippling') {
    // Parse Rippling time data from pasted text
    if (!data) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }
    const week = weekStart ? new Date(weekStart) : getCurrentWeekStart();
    const result = await parseRipplingTimeData(data, week);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'Invalid import type' }, { status: 400 });
}
