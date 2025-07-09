import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    try {
      // Use RETURNING to get the new user ID (PostgreSQL feature)
      const result = await db.query(
        'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
        [username, hashedPassword]
      );

      const userId = result.rows[0].id;

      return NextResponse.json(
        { message: 'User created successfully', userId },
        { status: 201 }
      );

    } catch (dbError: any) {
      // Handle PostgreSQL unique constraint violation
      if (dbError.code === '23505') { // PostgreSQL unique violation code
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 409 }
        );
      } else {
        console.error('Database error:', dbError);
        return NextResponse.json(
          { error: 'Database error' },
          { status: 500 }
        );
      }
    }

  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}