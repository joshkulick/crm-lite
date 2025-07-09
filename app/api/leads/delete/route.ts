import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db, pool } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

interface JWTPayload {
  userId: number;
  username: string;
}

interface DeleteLeadRequest {
  lead_id: number;
}

// DELETE - Delete a lead
export async function DELETE(request: NextRequest) {
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
    const deleteData: DeleteLeadRequest = await request.json();

    // Validate required fields
    if (!deleteData.lead_id) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    // First verify the lead belongs to the user
    const existingLead = await db.get(
      'SELECT id FROM leads WHERE id = $1 AND user_id = $2',
      [deleteData.lead_id, decoded.userId]
    ) as { id: number } | undefined;

    if (!existingLead) {
      return NextResponse.json(
        { error: 'Lead not found or access denied' },
        { status: 404 }
      );
    }

    // Get a client from the pool for transaction
    const client = await pool.connect();

    try {
      // Start transaction
      await client.query('BEGIN');

      // Delete all notes associated with this lead first
      await client.query(
        'DELETE FROM lead_notes WHERE lead_id = $1',
        [deleteData.lead_id]
      );

      // Delete the lead
      const result = await client.query(
        'DELETE FROM leads WHERE id = $1 AND user_id = $2',
        [deleteData.lead_id, decoded.userId]
      );

      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Lead not found or access denied' },
          { status: 404 }
        );
      }

      // Commit transaction
      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Lead deleted successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Delete lead API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
} 