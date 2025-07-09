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

    // Update the pipeline status
    const result = await db.run(
      `UPDATE leads 
       SET pipeline = $1
       WHERE id = $2 AND user_id = $3`,
      [
        updateData.pipeline,
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
      message: 'Pipeline status updated successfully',
      pipeline: updateData.pipeline
    });

  } catch (error) {
    console.error('Update pipeline API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}