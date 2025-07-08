// app/api/leads/pipeline/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

interface JWTPayload {
  userId: number;
  username: string;
}

interface UpdatePipelineRequest {
  lead_id: number;
  pipeline: 'Not Outreached' | 'Outreached' | 'Sent Info' | 'Demo' | 'Trial' | 'Customer' | 'Not Interested';
}

// PUT - Update pipeline status for a lead
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
    const updateData: UpdatePipelineRequest = await request.json();

    // Validate required fields
    if (!updateData.lead_id) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    if (!updateData.pipeline) {
      return NextResponse.json(
        { error: 'Pipeline status is required' },
        { status: 400 }
      );
    }

    // Validate pipeline status
    const validPipelineStatuses = [
      'Not Outreached',
      'Outreached',
      'Sent Info',
      'Demo',
      'Trial',
      'Customer',
      'Not Interested'
    ];

    if (!validPipelineStatuses.includes(updateData.pipeline)) {
      return NextResponse.json(
        { error: 'Invalid pipeline status' },
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

          // Update the pipeline status
          db.run(
            `UPDATE leads 
             SET pipeline = ?
             WHERE id = ? AND user_id = ?`,
            [
              updateData.pipeline,
              updateData.lead_id,
              decoded.userId
            ],
            function(updateErr: Error | null) {
              if (updateErr) {
                console.error('Error updating pipeline status:', updateErr);
                resolve(NextResponse.json(
                  { error: 'Failed to update pipeline status' },
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
                message: 'Pipeline status updated successfully',
                pipeline: updateData.pipeline
              }));
            }
          );
        }
      );
    });
  } catch (error) {
    console.error('Update pipeline API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
} 