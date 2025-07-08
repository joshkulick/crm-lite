import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

interface JWTPayload {
  userId: number;
  username: string;
}

interface CompanyRow {
  id: number;
  company_name: string;
  contact_names: string;
  deal_urls: string;
  phone_numbers: string;
  emails: string;
  created_at: string;
  user_id: number | null;
  claimed_by_username: string | null;
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

    // Get pagination parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Query to get companies with pagination
    return new Promise<NextResponse>((resolve) => {
      const query = `
        SELECT 
          ilc.id,
          ilc.company_name,
          ilc.contact_names,
          ilc.deal_urls,
          ilc.phone_numbers,
          ilc.emails,
          ilc.created_at,
          ilc.user_id,
          u.username as claimed_by_username
        FROM investor_lift_companies ilc
        LEFT JOIN users u ON ilc.user_id = u.id
        ORDER BY ilc.created_at DESC
        LIMIT ? OFFSET ?
      `;

      db.all(query, [limit + 1, offset], (err: Error | null, rows: CompanyRow[]) => {
        if (err) {
          console.error('Database error:', err);
          resolve(NextResponse.json(
            { error: 'Database error' },
            { status: 500 }
          ));
          return;
        }

        // Check if there are more results
        const hasMore = rows.length > limit;
        const companies = hasMore ? rows.slice(0, limit) : rows;

        // Parse JSON fields and format the data
        const formattedCompanies = companies.map((row, index) => {
          let contactNames = [];
          let dealUrls = [];
          let phoneNumbers = [];
          let emails = [];

          try {
            contactNames = JSON.parse(row.contact_names || '[]');
          } catch {
            console.warn('Failed to parse contact_names for company:', row.id);
          }

          try {
            dealUrls = JSON.parse(row.deal_urls || '[]');
          } catch {
            console.warn('Failed to parse deal_urls for company:', row.id);
          }

          try {
            phoneNumbers = JSON.parse(row.phone_numbers || '[]');
          } catch {
            console.warn('Failed to parse phone_numbers for company:', row.id);
          }

          try {
            emails = JSON.parse(row.emails || '[]');
          } catch {
            console.warn('Failed to parse emails for company:', row.id);
          }

          return {
            id: row.id,
            company_name: row.company_name,
            contact_names: contactNames,
            deal_urls: dealUrls,
            phone_numbers: phoneNumbers,
            emails: emails,
            created_at: row.created_at,
            is_claimed: row.user_id !== null,
            claimed_by_username: row.claimed_by_username,
            // Add a unique compound key for React
            unique_key: `${row.id}-${page}-${index}`
          };
        });

        resolve(NextResponse.json({
          companies: formattedCompanies,
          has_more: hasMore,
          page,
          total_returned: formattedCompanies.length
        }));
      });
    });
  } catch (error) {
    console.error('Outreach companies API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}