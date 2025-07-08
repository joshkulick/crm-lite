import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

interface JWTPayload {
  userId: number;
  username: string;
}

interface UpdateNotesRequest {
  company_id: number;
  notes: string;
}

export async function PUT(request: NextRequest) {
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
    const updateData: UpdateNotesRequest = await request.json();

    // Validate required fields
    if (!updateData.company_id) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    return new Promise<NextResponse>((resolve) => {
      // Check if this company is claimed (exists in leads table)
      db.get(
        'SELECT id FROM leads WHERE user_id = ? AND deal_id = ?',
        [decoded.userId, updateData.company_id],
        (err: Error | null, lead: { id: number } | undefined) => {
          if (err) {
            console.error('Database error checking lead:', err);
            resolve(NextResponse.json(
              { error: 'Database error' },
              { status: 500 }
            ));
            return;
          }

          if (lead) {
            // Company is claimed - update notes in leads table
            db.run(
              'UPDATE leads SET notes = ? WHERE id = ? AND user_id = ?',
              [updateData.notes || null, lead.id, decoded.userId],
              function(updateErr: Error | null) {
                if (updateErr) {
                  console.error('Error updating lead notes:', updateErr);
                  resolve(NextResponse.json(
                    { error: 'Failed to update notes' },
                    { status: 500 }
                  ));
                  return;
                }

                resolve(NextResponse.json({
                  message: 'Notes updated successfully',
                  notes: updateData.notes
                }));
              }
            );
          } else {
            // Company is not claimed - cannot add notes until claimed
            resolve(NextResponse.json(
              { error: 'Company must be claimed before adding notes' },
              { status: 400 }
            ));
          }
        }
      );
    });
  } catch (error) {
    console.error('Company notes API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
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

    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Get company_id from URL params
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    return new Promise<NextResponse>((resolve) => {
      // Only get notes from leads table (claimed companies only)
      db.get(
        'SELECT notes FROM leads WHERE user_id = ? AND deal_id = ?',
        [decoded.userId, companyId],
        (err: Error | null, lead: { notes: string | null } | undefined) => {
          if (err) {
            console.error('Database error checking lead:', err);
            resolve(NextResponse.json(
              { error: 'Database error' },
              { status: 500 }
            ));
            return;
          }

          if (lead) {
            // Company is claimed - get notes from leads table
            resolve(NextResponse.json({
              notes: lead.notes || ''
            }));
          } else {
            // Company is not claimed - no notes available
            resolve(NextResponse.json({
              notes: ''
            }));
          }
        }
      );
    });
  } catch (error) {
    console.error('Company notes GET API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}