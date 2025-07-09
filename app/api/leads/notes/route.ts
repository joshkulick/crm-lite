import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

interface JWTPayload {
  userId: number;
  username: string;
}

interface UpdateNotesRequest {
  lead_id: number;
  notes: string;
}

// GET - Retrieve notes for a specific lead
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

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('lead_id');

    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    const row = await db.get(
      'SELECT notes FROM leads WHERE id = $1 AND user_id = $2',
      [leadId, decoded.userId]
    ) as { notes: string } | undefined;

    if (!row) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ notes: row.notes || '' });

  } catch (error) {
    console.error('Get notes API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

// PUT - Update notes for a lead
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
    if (!updateData.lead_id) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
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
        { error: 'Lead not found or access denied' },
        { status: 404 }
      );
    }

    // Update the notes
    await db.run(
      'UPDATE leads SET notes = $1 WHERE id = $2 AND user_id = $3',
      [updateData.notes, updateData.lead_id, decoded.userId]
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Notes updated successfully' 
    });

  } catch (error) {
    console.error('Update notes API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}