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

    // Check if this company is claimed (exists in leads table)
    const lead = await db.get(
      'SELECT id FROM leads WHERE user_id = $1 AND deal_id = $2',
      [decoded.userId, updateData.company_id]
    ) as { id: number } | undefined;

    if (lead) {
      // Company is claimed - update notes in leads table
      await db.run(
        'UPDATE leads SET notes = $1 WHERE id = $2 AND user_id = $3',
        [updateData.notes || null, lead.id, decoded.userId]
      );

      return NextResponse.json({
        message: 'Notes updated successfully',
        notes: updateData.notes
      });
    } else {
      // Company is not claimed - cannot add notes until claimed
      return NextResponse.json(
        { error: 'Company must be claimed before adding notes' },
        { status: 400 }
      );
    }

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

    // Only get notes from leads table (claimed companies only)
    const lead = await db.get(
      'SELECT notes FROM leads WHERE user_id = $1 AND deal_id = $2',
      [decoded.userId, companyId]
    ) as { notes: string | null } | undefined;

    if (lead) {
      // Company is claimed - get notes from leads table
      return NextResponse.json({
        notes: lead.notes || ''
      });
    } else {
      // Company is not claimed - no notes available
      return NextResponse.json({
        notes: ''
      });
    }

  } catch (error) {
    console.error('Company notes GET API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}