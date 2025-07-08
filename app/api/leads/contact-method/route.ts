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
  created_at: string;
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

    return new Promise<NextResponse>((resolve) => {
      if (leadId) {
        // Get specific lead contact info
        db.get(
          `SELECT id, company, contact_name, point_of_contact, preferred_contact_method, 
           preferred_contact_value, phone_numbers, emails, status, created_at
           FROM leads 
           WHERE id = ? AND user_id = ?`,
          [leadId, decoded.userId],
          (err: Error | null, row: LeadContactInfo | undefined) => {
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

            resolve(NextResponse.json({
              lead: {
                ...row,
                phone_numbers: phoneNumbers,
                emails: emails
              }
            }));
          }
        );
      } else {
        // Get all leads with contact info for the user
        db.all(
          `SELECT id, company, contact_name, point_of_contact, preferred_contact_method, 
           preferred_contact_value, phone_numbers, emails, status, created_at
           FROM leads 
           WHERE user_id = ? 
           ORDER BY created_at DESC`,
          [decoded.userId],
          (err: Error | null, rows: LeadContactInfo[]) => {
            if (err) {
              console.error('Database error:', err);
              resolve(NextResponse.json(
                { error: 'Database error' },
                { status: 500 }
              ));
              return;
            }

            // Parse JSON fields for all leads
            const leads = rows.map(row => {
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

              return {
                ...row,
                phone_numbers: phoneNumbers,
                emails: emails
              };
            });

            resolve(NextResponse.json({ leads }));
          }
        );
      }
    });
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

    return new Promise<NextResponse>((resolve) => {
      // First verify the lead belongs to the user
      db.get(
        'SELECT id FROM leads WHERE id = ? AND user_id = ?',
        [updateData.lead_id, decoded.userId],
        (err: Error | null, existingLead: { id: number } | undefined) => {
          if (err) {
            console.error('Database error:', err);
            resolve(NextResponse.json(
              { error: 'Database error' },
              { status: 500 }
            ));
            return;
          }

          if (!existingLead) {
            resolve(NextResponse.json(
              { error: 'Lead not found or does not belong to you' },
              { status: 404 }
            ));
            return;
          }

          // Update the contact method information
          db.run(
            `UPDATE leads 
             SET point_of_contact = ?, 
                 preferred_contact_method = ?, 
                 preferred_contact_value = ?
             WHERE id = ? AND user_id = ?`,
            [
              updateData.point_of_contact || null,
              updateData.preferred_contact_method || null,
              updateData.preferred_contact_value || null,
              updateData.lead_id,
              decoded.userId
            ],
            function(updateErr: Error | null) {
              if (updateErr) {
                console.error('Error updating contact method:', updateErr);
                resolve(NextResponse.json(
                  { error: 'Failed to update contact method' },
                  { status: 500 }
                ));
                return;
              }

              if (this.changes === 0) {
                resolve(NextResponse.json(
                  { error: 'No changes made' },
                  { status: 400 }
                ));
                return;
              }

              resolve(NextResponse.json({
                message: 'Contact method updated successfully',
                updated_fields: {
                  point_of_contact: updateData.point_of_contact,
                  preferred_contact_method: updateData.preferred_contact_method,
                  preferred_contact_value: updateData.preferred_contact_value
                }
              }));
            }
          );
        }
      );
    });
  } catch (error) {
    console.error('Update contact method API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}