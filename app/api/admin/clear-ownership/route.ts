import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

interface JWTPayload {
  userId: number;
  username: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // TODO: Add admin role check here if you implement user roles
    // For now, any authenticated user can clear ownership (for testing)

    return new Promise<NextResponse>((resolve) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // First, get count of companies that will be affected
        db.get(
          'SELECT COUNT(*) as count FROM investor_lift_companies WHERE user_id IS NOT NULL',
          [],
          (countErr: Error | null, countResult: { count: number } | undefined) => {
            if (countErr) {
              console.error('Error counting owned companies:', countErr);
              db.run('ROLLBACK');
              resolve(NextResponse.json(
                { error: 'Database error during count' },
                { status: 500 }
              ));
              return;
            }

            const clearedCount = countResult?.count || 0;

            // Clear all ownership from investor_lift_companies
            db.run(
              'UPDATE investor_lift_companies SET user_id = NULL',
              [],
              function(updateErr: Error | null) {
                if (updateErr) {
                  console.error('Error clearing ownership:', updateErr);
                  db.run('ROLLBACK');
                  resolve(NextResponse.json(
                    { error: 'Failed to clear ownership' },
                    { status: 500 }
                  ));
                  return;
                }

                // Also clear claimed leads from the leads table (optional)
                db.run(
                  'DELETE FROM leads WHERE account_type = ?',
                  ['investor_lift_claimed'],
                  function(deleteErr: Error | null) {
                    if (deleteErr) {
                      console.error('Error deleting claimed leads:', deleteErr);
                      // Don't fail the request if this fails
                    }

                    db.run('COMMIT', (commitErr: Error | null) => {
                      if (commitErr) {
                        console.error('Commit error:', commitErr);
                        resolve(NextResponse.json(
                          { error: 'Failed to commit changes' },
                          { status: 500 }
                        ));
                      } else {
                        console.log(`Successfully cleared ownership for ${clearedCount} companies by user ${decoded.username}`);
                        
                        resolve(NextResponse.json({
                          message: 'Ownership cleared successfully',
                          cleared_count: clearedCount,
                          deleted_leads: this.changes || 0
                        }));
                      }
                    });
                  }
                );
              }
            );
          }
        );
      });
    });
  } catch (error) {
    console.error('Clear ownership API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}