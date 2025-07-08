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

    return new Promise<NextResponse>((resolve) => {
      db.get(
        'SELECT notes FROM leads WHERE id = ? AND user_id = ?',
        [leadId, decoded.userId],
        (err: Error | null, row: { notes: string } | undefined) => {
          if (err) {
            console.error('Database error:', err);
            resolve(NextResponse.json(
              { error: 'Database error' },
              { status: 500 }
            ));
            return;
          }

          if (!row) {
            resolve(NextResponse.json(
              { error: 'Lead not found' },
              { status: 404 }
            ));
            return;
          }

          resolve(NextResponse.json({ notes: row.notes || '' }));
        }
      );
    });
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

    return new Promise<NextResponse>((resolve) => {
      // First verify the lead belongs to the user
      db.get(
        'SELECT id FROM leads WHERE id = ? AND user_id = ?',
        [updateData.lead_id, decoded.userId],
        (err: Error | null, row: { id: number } | undefined) => {
          if (err) {
            console.error('Database error:', err);
            resolve(NextResponse.json(
              { error: 'Database error' },
              { status: 500 }
            ));
            return;
          }

          if (!row) {
            resolve(NextResponse.json(
              { error: 'Lead not found or access denied' },
              { status: 404 }
            ));
            return;
          }

          // Update the notes
          db.run(
            'UPDATE leads SET notes = ? WHERE id = ? AND user_id = ?',
            [updateData.notes, updateData.lead_id, decoded.userId],
            function(err: Error | null) {
              if (err) {
                console.error('Database error:', err);
                resolve(NextResponse.json(
                  { error: 'Database error' },
                  { status: 500 }
                ));
                return;
              }

              resolve(NextResponse.json({ 
                success: true, 
                message: 'Notes updated successfully' 
              }));
            }
          );
        }
      );
    });
  } catch (error) {
    console.error('Update notes API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
} 