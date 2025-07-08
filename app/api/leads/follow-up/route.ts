// app/api/leads/follow-up/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

interface JWTPayload {
  userId: number;
  username: string;
}

interface UpdateFollowUpRequest {
  lead_id: number;
  next_follow_up: string; // ISO date string
}

// PUT - Update follow-up date for a lead
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
    const updateData: UpdateFollowUpRequest = await request.json();

    // Validate required fields
    if (!updateData.lead_id) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    if (!updateData.next_follow_up) {
      return NextResponse.json(
        { error: 'Next follow-up date is required' },
        { status: 400 }
      );
    }

    // Validate date format
    const followUpDate = new Date(updateData.next_follow_up);
    if (isNaN(followUpDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    return new Promise<NextResponse>((resolve) => {
      // First verify the lead belongs to the user
      db.get(
        'SELECT id FROM leads WHERE id = ? AND user_id = ?',
        [updateData.lead_id, decoded.userId],
        (err: Error | null, existingLead: { id: number } | undefined) => {
          if (err) {
            console.error('Database error:', err);
            resolve(NextResponse.json(
              { error: 'Database error' },
              { status: 500 }
            ));
            return;
          }

          if (!existingLead) {
            resolve(NextResponse.json(
              { error: 'Lead not found or does not belong to you' },
              { status: 404 }
            ));
            return;
          }

          // Update the follow-up date
          db.run(
            `UPDATE leads 
             SET next_follow_up = ?
             WHERE id = ? AND user_id = ?`,
            [
              updateData.next_follow_up,
              updateData.lead_id,
              decoded.userId
            ],
            function(updateErr: Error | null) {
              if (updateErr) {
                console.error('Error updating follow-up date:', updateErr);
                resolve(NextResponse.json(
                  { error: 'Failed to update follow-up date' },
                  { status: 500 }
                ));
                return;
              }

              if (this.changes === 0) {
                resolve(NextResponse.json(
                  { error: 'No changes made' },
                  { status: 400 }
                ));
                return;
              }

              resolve(NextResponse.json({
                message: 'Follow-up date updated successfully',
                next_follow_up: updateData.next_follow_up
              }));
            }
          );
        }
      );
    });
  } catch (error) {
    console.error('Update follow-up API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
} 