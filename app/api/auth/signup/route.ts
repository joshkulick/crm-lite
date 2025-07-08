import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

// Extended Error type for SQLite errors
interface SQLiteError extends Error {
  code?: string;
}

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

    return new Promise<NextResponse>((resolve) => {
      db.run(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, hashedPassword],
        function(this: { lastID: number }, err: SQLiteError | null) {
          if (err) {
            if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
              resolve(NextResponse.json(
                { error: 'Username already exists' },
                { status: 409 }
              ));
            } else {
              console.error('Database error:', err);
              resolve(NextResponse.json(
                { error: 'Database error' },
                { status: 500 }
              ));
            }
          } else {
            resolve(NextResponse.json(
              { message: 'User created successfully', userId: this.lastID },
              { status: 201 }
            ));
          }
        }
      );
    });
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}