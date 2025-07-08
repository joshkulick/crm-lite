// app/api/outreach/unclaim-company/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

interface JWTPayload {
  userId: number;
  username: string;
}

interface UnclaimCompanyRequest {
  company_id: number;
  company_name: string;
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

    // Parse the request body
    const unclaimData: UnclaimCompanyRequest = await request.json();

    // Validate required fields
    if (!unclaimData.company_id || !unclaimData.company_name) {
      return NextResponse.json(
        { error: 'Company ID and name are required' },
        { status: 400 }
      );
    }

    return new Promise<NextResponse>((resolve) => {
      db.serialize(() => {
        // Start a transaction
        db.run('BEGIN TRANSACTION', (beginErr: Error | null) => {
          if (beginErr) {
            console.error('Transaction begin error:', beginErr);
            resolve(NextResponse.json(
              { error: 'Database transaction error' },
              { status: 500 }
            ));
            return;
          }

          // First, remove from leads table (claimed leads)
          db.run(
            'DELETE FROM leads WHERE user_id = ? AND company = ? AND deal_id = ?',
            [decoded.userId, unclaimData.company_name, unclaimData.company_id],
            function(deleteErr: Error | null) {
              if (deleteErr) {
                console.error('Error deleting from leads:', deleteErr);
                db.run('ROLLBACK');
                resolve(NextResponse.json(
                  { error: 'Failed to remove lead from your list' },
                  { status: 500 }
                ));
                return;
              }

              // Then, update the investor_lift_companies table to mark as unclaimed
              db.run(
                'UPDATE investor_lift_companies SET user_id = NULL WHERE id = ?',
                [unclaimData.company_id],
                function(updateErr: Error | null) {
                  if (updateErr) {
                    console.error('Error updating investor_lift_companies:', updateErr);
                    db.run('ROLLBACK');
                    resolve(NextResponse.json(
                      { error: 'Failed to update company status' },
                      { status: 500 }
                    ));
                    return;
                  }

                  // Commit the transaction
                  db.run('COMMIT', (commitErr: Error | null) => {
                    if (commitErr) {
                      console.error('Commit error:', commitErr);
                      resolve(NextResponse.json(
                        { error: 'Failed to commit changes' },
                        { status: 500 }
                      ));
                      return;
                    }

                    console.log(`User ${decoded.username} unclaimed company: ${unclaimData.company_name}`);
                    
                    resolve(NextResponse.json({
                      message: 'Company unclaimed successfully',
                      company_name: unclaimData.company_name
                    }));
                  });
                }
              );
            }
          );
        });
      });
    });
  } catch (error) {
    console.error('Unclaim company API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}