import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const VALID_USERNAME = process.env.AUTH_USERNAME || 'halluminate';
const VALID_PASSWORD = process.env.AUTH_PASSWORD || 'expertmanagement65';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      const cookieStore = await cookies();

      // Set a secure session cookie
      cookieStore.set('auth_session', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
