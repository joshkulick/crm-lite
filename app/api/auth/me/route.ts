import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

interface User {
  id: number;
  username: string;
  password: string;
  created_at: string;
}

interface JWTPayload {
  userId: number;
  username: string;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Get user from database
    return new Promise<NextResponse>((resolve) => {
      db.get(
        'SELECT id, username, created_at FROM users WHERE id = ?',
        [decoded.userId],
        (err: Error | null, user: User | undefined) => {
          if (err) {
            console.error('Database error:', err);
            resolve(NextResponse.json(
              { error: 'Database error' },
              { status: 500 }
            ));
            return;
          }

          if (!user) {
            resolve(NextResponse.json(
              { error: 'User not found' },
              { status: 401 }
            ));
            return;
          }

          resolve(NextResponse.json({
            user: {
              id: user.id,
              username: user.username
            }
          }));
        }
      );
    });
  } catch (error) {
    console.error('Token verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
}