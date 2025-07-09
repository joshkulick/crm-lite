import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { pool } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

interface JWTPayload {
  userId: number;
  username: string;
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

    // TODO: Add admin role check here if you implement user roles
    // For now, any authenticated user can clear ownership (for testing)

    // Get a client from the pool for transaction
    const client = await pool.connect();

    try {
      // Start transaction
      await client.query('BEGIN');

      // First, get count of companies that will be affected
      const countResult = await client.query(
        'SELECT COUNT(*) as count FROM investor_lift_companies WHERE user_id IS NOT NULL'
      );

      const clearedCount = parseInt(countResult.rows[0]?.count || '0');

      // Clear all ownership from investor_lift_companies
      await client.query(
        'UPDATE investor_lift_companies SET user_id = NULL'
      );

      // Also clear claimed leads from the leads table (optional)
      const deleteResult = await client.query(
        'DELETE FROM leads WHERE account_type = $1',
        ['investor_lift_claimed']
      );

      // Commit transaction
      await client.query('COMMIT');

      console.log(`Successfully cleared ownership for ${clearedCount} companies by user ${decoded.username}`);
      
      return NextResponse.json({
        message: 'Ownership cleared successfully',
        cleared_count: clearedCount,
        deleted_leads: deleteResult.rowCount || 0
      });

    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      console.error('Error in clear ownership transaction:', error);
      
      return NextResponse.json(
        { error: 'Failed to clear ownership' },
        { status: 500 }
      );
    } finally {
      // Release the client back to pool
      client.release();
    }

  } catch (error) {
    console.error('Clear ownership API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}