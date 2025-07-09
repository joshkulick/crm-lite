// app/api/outreach/unclaim-company/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { pool } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

interface JWTPayload {
  userId: number;
  username: string;
}

interface UnclaimCompanyRequest {
  company_id: number;
  company_name: string;
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

    // Parse the request body
    const unclaimData: UnclaimCompanyRequest = await request.json();

    // Validate required fields
    if (!unclaimData.company_id || !unclaimData.company_name) {
      return NextResponse.json(
        { error: 'Company ID and name are required' },
        { status: 400 }
      );
    }

    // Get a client from the pool for transaction
    const client = await pool.connect();

    try {
      // Start transaction
      await client.query('BEGIN');

      // First, remove from leads table (claimed leads)
      await client.query(
        'DELETE FROM leads WHERE user_id = $1 AND company = $2 AND deal_id = $3',
        [decoded.userId, unclaimData.company_name, unclaimData.company_id]
      );

      // Then, update the investor_lift_companies table to mark as unclaimed
      await client.query(
        'UPDATE investor_lift_companies SET user_id = NULL WHERE id = $1',
        [unclaimData.company_id]
      );

      // Commit the transaction
      await client.query('COMMIT');

      console.log(`User ${decoded.username} unclaimed company: ${unclaimData.company_name}`);
      
      return NextResponse.json({
        message: 'Company unclaimed successfully',
        company_name: unclaimData.company_name
      });

    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      console.error('Error in unclaim company transaction:', error);
      
      return NextResponse.json(
        { error: 'Failed to unclaim company' },
        { status: 500 }
      );
    } finally {
      // Release the client back to pool
      client.release();
    }

  } catch (error) {
    console.error('Unclaim company API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}