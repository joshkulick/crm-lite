import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

interface JWTPayload {
  userId: number;
  username: string;
}

interface CreateLeadRequest {
  company: string;
  contact_name?: string;
  phone_numbers?: string[];
  emails?: string[];
  point_of_contact?: string;
  preferred_contact_method?: 'call' | 'email' | 'text';
  preferred_contact_value?: string;
  pipeline?: string;
  next_follow_up?: string;
}

// POST - Create a new lead
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
    const createData: CreateLeadRequest = await request.json();

    // Validate required fields
    if (!createData.company || createData.company.trim() === '') {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Validate contact method if provided
    if (createData.preferred_contact_method && !['call', 'email', 'text'].includes(createData.preferred_contact_method)) {
      return NextResponse.json(
        { error: 'Invalid contact method. Must be call, email, or text' },
        { status: 400 }
      );
    }

    // Validate pipeline status if provided
    const validPipelineStatuses = [
      'Not Outreached',
      'Outreached',
      'Sent Info',
      'Demo',
      'Trial',
      'Customer',
      'Not Interested'
    ];

    if (createData.pipeline && !validPipelineStatuses.includes(createData.pipeline)) {
      return NextResponse.json(
        { error: 'Invalid pipeline status' },
        { status: 400 }
      );
    }

    // Prepare phone numbers and emails as JSON strings
    const phoneNumbersJson = JSON.stringify(createData.phone_numbers || []);
    const emailsJson = JSON.stringify(createData.emails || []);

    // Insert the new lead
    const result = await db.run(
      `INSERT INTO leads (
        company,
        contact_name,
        phone_numbers,
        emails,
        point_of_contact,
        preferred_contact_method,
        preferred_contact_value,
        pipeline,
        next_follow_up,
        status,
        user_id,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, company, contact_name, phone_numbers, emails, point_of_contact, preferred_contact_method, preferred_contact_value, pipeline, next_follow_up, status, created_at`,
      [
        createData.company.trim(),
        createData.contact_name?.trim() || null,
        phoneNumbersJson,
        emailsJson,
        createData.point_of_contact?.trim() || null,
        createData.preferred_contact_method || null,
        createData.preferred_contact_value?.trim() || null,
        createData.pipeline || 'Not Outreached',
        createData.next_follow_up || null,
        'new',
        decoded.userId,
        new Date().toISOString()
      ]
    );

    const newLead = result.rows[0];

    // Parse the JSON fields for the response
    let phoneNumbers = [];
    let emails = [];

    try {
      phoneNumbers = JSON.parse(newLead.phone_numbers || '[]');
    } catch {
      console.warn('Failed to parse phone_numbers for new lead:', newLead.id);
    }

    try {
      emails = JSON.parse(newLead.emails || '[]');
    } catch {
      console.warn('Failed to parse emails for new lead:', newLead.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Lead created successfully',
      lead: {
        ...newLead,
        phone_numbers: phoneNumbers,
        emails: emails,
        notes: []
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Create lead API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
} 