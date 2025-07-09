// app/api/leads/contact-method/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

interface JWTPayload {
  userId: number;
  username: string;
}

interface UpdateContactMethodRequest {
  lead_id: number;
  contact_name?: string;
  point_of_contact?: string;
  preferred_contact_method?: 'call' | 'email' | 'text';
  preferred_contact_value?: string;
}

interface LeadContactInfo {
  id: number;
  company: string;
  contact_name: string;
  point_of_contact: string | null;
  preferred_contact_method: string | null;
  preferred_contact_value: string | null;
  phone_numbers: string;
  emails: string;
  status: string;
  next_follow_up: string | null;
  pipeline: string;
  created_at: string;
  notes: string | null;
}

// GET - Retrieve contact method information for user's leads
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

    if (leadId) {
      // Get specific lead contact info
      const row = await db.get(
        `SELECT id, company, contact_name, point_of_contact, preferred_contact_method, 
         preferred_contact_value, phone_numbers, emails, status, next_follow_up, pipeline, created_at, notes
         FROM leads 
         WHERE id = $1 AND user_id = $2`,
        [leadId, decoded.userId]
      ) as LeadContactInfo | undefined;

      if (!row) {
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404 }
        );
      }

      // Parse JSON fields
      let phoneNumbers = [];
      let emails = [];

      try {
        phoneNumbers = JSON.parse(row.phone_numbers || '[]');
      } catch {
        console.warn('Failed to parse phone_numbers for lead:', row.id);
      }

      try {
        emails = JSON.parse(row.emails || '[]');
      } catch {
        console.warn('Failed to parse emails for lead:', row.id);
      }

      // Fetch notes for this lead
      let notes = [];
      try {
        const notesResult = await db.all(
          'SELECT id, lead_id, user_id, content, created_at FROM lead_notes WHERE lead_id = $1 ORDER BY created_at DESC',
          [row.id]
        );
        notes = notesResult;
      } catch (error) {
        console.warn('Failed to fetch notes for lead:', row.id, error);
      }

      return NextResponse.json({
        lead: {
          ...row,
          phone_numbers: phoneNumbers,
          emails: emails,
          notes: notes
        }
      });

    } else {
      // Get all leads with contact info for the user
      const rows = await db.all(
        `SELECT id, company, contact_name, point_of_contact, preferred_contact_method, 
         preferred_contact_value, phone_numbers, emails, status, next_follow_up, pipeline, created_at, notes
         FROM leads 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [decoded.userId]
      ) as LeadContactInfo[];

      // Parse JSON fields and fetch notes for all leads
      const leads = await Promise.all(rows.map(async row => {
        let phoneNumbers = [];
        let emails = [];

        try {
          phoneNumbers = JSON.parse(row.phone_numbers || '[]');
        } catch {
          console.warn('Failed to parse phone_numbers for lead:', row.id);
        }

        try {
          emails = JSON.parse(row.emails || '[]');
        } catch {
          console.warn('Failed to parse emails for lead:', row.id);
        }

        // Fetch notes for this lead
        let notes = [];
        try {
          const notesResult = await db.all(
            'SELECT id, lead_id, user_id, content, created_at FROM lead_notes WHERE lead_id = $1 ORDER BY created_at DESC',
            [row.id]
          );
          notes = notesResult;
        } catch (error) {
          console.warn('Failed to fetch notes for lead:', row.id, error);
        }

        return {
          ...row,
          phone_numbers: phoneNumbers,
          emails: emails,
          notes: notes
        };
      }));

      return NextResponse.json({ leads });
    }

  } catch (error) {
    console.error('Get contact method API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

// PUT - Update contact method information for a lead
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
    const updateData: UpdateContactMethodRequest = await request.json();

    // Validate required fields
    if (!updateData.lead_id) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    // Validate contact method if provided
    if (updateData.preferred_contact_method && !['call', 'email', 'text'].includes(updateData.preferred_contact_method)) {
      return NextResponse.json(
        { error: 'Invalid contact method. Must be call, email, or text' },
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

    // Update the contact method information
    const result = await db.run(
      `UPDATE leads 
       SET contact_name = $1, 
           point_of_contact = $2, 
           preferred_contact_method = $3, 
           preferred_contact_value = $4
       WHERE id = $5 AND user_id = $6`,
      [
        updateData.contact_name || null,
        updateData.point_of_contact || null,
        updateData.preferred_contact_method || null,
        updateData.preferred_contact_value || null,
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
      message: 'Contact method updated successfully',
      updated_fields: {
        contact_name: updateData.contact_name,
        point_of_contact: updateData.point_of_contact,
        preferred_contact_method: updateData.preferred_contact_method,
        preferred_contact_value: updateData.preferred_contact_value
      }
    });

  } catch (error) {
    console.error('Update contact method API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}