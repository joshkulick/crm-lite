import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { pool } from '@/lib/db';
import { broadcastClaimEvent } from '@/lib/eventSystem';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

interface JWTPayload {
  userId: number;
  username: string;
}

interface PhoneNumber {
  number: string;
  associated_deal_urls: string[];
}

interface Email {
  email: string;
  associated_deal_urls: string[];
}

interface ClaimCompanyRequest {
  company_id: number;
  company_name: string;
  contact_names: string[];
  deal_urls: string[];
  phone_numbers: PhoneNumber[];
  emails: Email[];
  point_of_contact?: string;
  preferred_contact_method?: 'call' | 'email' | 'text';
  preferred_contact_value?: string;
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
    const claimData: ClaimCompanyRequest = await request.json();

    // Validate required fields
    if (!claimData.company_id || !claimData.company_name) {
      return NextResponse.json(
        { error: 'Company ID and name are required' },
        { status: 400 }
      );
    }

    // Validate contact method fields if provided
    if (claimData.preferred_contact_method && !claimData.preferred_contact_value) {
      return NextResponse.json(
        { error: 'Contact value is required when contact method is specified' },
        { status: 400 }
      );
    }

    if (claimData.preferred_contact_method && !['call', 'email', 'text'].includes(claimData.preferred_contact_method)) {
      return NextResponse.json(
        { error: 'Invalid contact method. Must be call, email, or text' },
        { status: 400 }
      );
    }

    // Get a client from the pool for transaction
    const client = await pool.connect();

    try {
      // Start transaction
      await client.query('BEGIN');

      // First check if this company is already claimed by this user
      const existingLead = await client.query(
        'SELECT id FROM leads WHERE user_id = $1 AND company = $2 AND deal_id = $3',
        [decoded.userId, claimData.company_name, claimData.company_id]
      );

      if (existingLead.rows.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'You have already claimed this company' },
          { status: 409 }
        );
      }

      // Check if company is already claimed by someone else
      const existingClaim = await client.query(
        'SELECT user_id FROM investor_lift_companies WHERE id = $1 AND user_id IS NOT NULL',
        [claimData.company_id]
      );

      if (existingClaim.rows.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'This company has already been claimed by another user' },
          { status: 409 }
        );
      }

      // Create a consolidated contact string
      let contactInfo = '';
      
      // Add contact names
      if (claimData.contact_names.length > 0) {
        contactInfo = claimData.contact_names.join(', ');
      }
      
      // Prepare phone numbers and emails as JSON strings for the leads table
      const phoneNumbersJson = JSON.stringify(claimData.phone_numbers);
      const emailsJson = JSON.stringify(claimData.emails);

      // Insert into leads table with new contact method fields
      const insertQuery = `
        INSERT INTO leads (
          deal_id,
          contact_name,
          company,
          account_type,
          phone_numbers,
          emails,
          point_of_contact,
          preferred_contact_method,
          preferred_contact_value,
          status,
          user_id,
          scrape_timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `;

      const insertResult = await client.query(insertQuery, [
        claimData.company_id,
        contactInfo || 'Unknown',
        claimData.company_name,
        'investor_lift_claimed',
        phoneNumbersJson,
        emailsJson,
        claimData.point_of_contact || null,
        claimData.preferred_contact_method || null,
        claimData.preferred_contact_value || null,
        'claimed',
        decoded.userId,
        new Date().toISOString()
      ]);

      const leadId = insertResult.rows[0].id;

      // Update the investor_lift_companies table to mark as claimed
      await client.query(
        'UPDATE investor_lift_companies SET user_id = $1 WHERE id = $2',
        [decoded.userId, claimData.company_id]
      );

      // Commit transaction
      await client.query('COMMIT');

      // Broadcast the claim event to all connected clients
      broadcastClaimEvent(claimData.company_id, decoded.username, claimData.company_name);

      return NextResponse.json(
        { 
          message: 'Company claimed successfully',
          lead_id: leadId,
          contact_info: {
            point_of_contact: claimData.point_of_contact,
            preferred_contact_method: claimData.preferred_contact_method,
            preferred_contact_value: claimData.preferred_contact_value
          }
        },
        { status: 201 }
      );

    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      console.error('Error in claim company transaction:', error);
      
      return NextResponse.json(
        { error: 'Failed to claim company' },
        { status: 500 }
      );
    } finally {
      // Release the client back to pool
      client.release();
    }

  } catch (error) {
    console.error('Claim company API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}