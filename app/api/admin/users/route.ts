import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface UserWithLeads {
  id: number;
  username: string;
  created_at: string;
  lead_count: number;
}

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Query to get all users with their lead counts
    return new Promise<NextResponse>((resolve) => {
      const query = `
        SELECT 
          u.id,
          u.username,
          u.created_at,
          COUNT(l.id) as lead_count
        FROM users u
        LEFT JOIN leads l ON u.id = l.user_id
        GROUP BY u.id, u.username, u.created_at
        ORDER BY u.created_at DESC
      `;

      db.all(query, [], (err: Error | null, rows: UserWithLeads[]) => {
        if (err) {
          console.error('Database error:', err);
          resolve(NextResponse.json(
            { error: 'Database error' },
            { status: 500 }
          ));
          return;
        }

        // Format the data
        const users = rows.map(row => ({
          id: row.id,
          username: row.username,
          created_at: row.created_at,
          lead_count: Number(row.lead_count) || 0
        }));

        resolve(NextResponse.json({
          users,
          totalUsers: users.length,
          totalLeads: users.reduce((sum, user) => sum + user.lead_count, 0)
        }));
      });
    });
  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}