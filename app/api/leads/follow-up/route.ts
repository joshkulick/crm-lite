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

    // First verify the lead belongs to the user
    const existingLead = await db.get(
      'SELECT id FROM leads WHERE id = $1 AND user_id = $2',
      [updateData.lead_id, decoded.userId]
    ) as { id: number } | undefined;

    if (!existingLead) {
      return NextResponse.json(
        { error: 'Lead not found or does not belong to you' },
        { status: 404 }
      );
    }

    // Update the follow-up date
    const result = await db.run(
      `UPDATE leads 
       SET next_follow_up = $1
       WHERE id = $2 AND user_id = $3`,
      [
        updateData.next_follow_up,
        updateData.lead_id,
        decoded.userId
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'No changes made' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Follow-up date updated successfully',
      next_follow_up: updateData.next_follow_up
    });

  } catch (error) {
    console.error('Update follow-up API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}