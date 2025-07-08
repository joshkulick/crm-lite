import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

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

interface ExistingLead {
  id: number;
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

    return new Promise<NextResponse>((resolve) => {
      db.serialize(() => {
        // First check if this company is already claimed by this user
        db.get(
          'SELECT id FROM leads WHERE user_id = ? AND company = ? AND deal_id = ?',
          [decoded.userId, claimData.company_name, claimData.company_id],
          (err: Error | null, existingLead: ExistingLead | undefined) => {
            if (err) {
              console.error('Database error checking existing lead:', err);
              resolve(NextResponse.json(
                { error: 'Database error' },
                { status: 500 }
              ));
              return;
            }

            if (existingLead) {
              resolve(NextResponse.json(
                { error: 'You have already claimed this company' },
                { status: 409 }
              ));
              return;
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
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.run(
              insertQuery,
              [
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
              ],
              function(insertErr: Error | null) {
                if (insertErr) {
                  console.error('Error inserting claimed lead:', insertErr);
                  resolve(NextResponse.json(
                    { error: 'Failed to claim company' },
                    { status: 500 }
                  ));
                  return;
                }

                // Update the investor_lift_companies table to mark as claimed
                db.run(
                  'UPDATE investor_lift_companies SET user_id = ? WHERE id = ?',
                  [decoded.userId, claimData.company_id],
                  function(updateErr: Error | null) {
                    if (updateErr) {
                      console.error('Error updating investor_lift_companies:', updateErr);
                      // Still resolve successfully since the lead was created
                    }

                    resolve(NextResponse.json(
                      { 
                        message: 'Company claimed successfully',
                        lead_id: this.lastID,
                        contact_info: {
                          point_of_contact: claimData.point_of_contact,
                          preferred_contact_method: claimData.preferred_contact_method,
                          preferred_contact_value: claimData.preferred_contact_value
                        }
                      },
                      { status: 201 }
                    ));
                  }
                );
              }
            );
          }
        );
      });
    });
  } catch (error) {
    console.error('Claim company API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}