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
  notes: string | null;
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

    // Get pagination, search, and filter parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const phoneOnly = searchParams.get('phoneOnly') === 'true';
    const myClaims = searchParams.get('myClaims') === 'true';
    const unclaimed = searchParams.get('unclaimed') === 'true';
    const hasPhone = searchParams.get('hasPhone') === 'true';
    const hasEmail = searchParams.get('hasEmail') === 'true';
    const hasDeals = searchParams.get('hasDeals') === 'true';
    const offset = (page - 1) * limit;

    // Build search and filter conditions
    let queryParams: (string | number)[] = [decoded.userId];
    let whereConditions: string[] = [];
    let paramIdx = 2;

    // Search condition
    if (search.trim()) {
      const searchTerm = `%${search.toLowerCase()}%`;
      const normalizedSearchTerm = search.replace(/[^0-9]/g, ''); // Remove non-digits for phone search
      
      if (phoneOnly && normalizedSearchTerm.length >= 3) {
        // Phone-only search: only search phone numbers with intelligent prefix matching
        whereConditions.push(`
          EXISTS (
            SELECT 1 FROM jsonb_array_elements(ilc.phone_numbers::jsonb) AS phone
            WHERE phone->>'number' = $${paramIdx} OR
                  REPLACE(phone->>'number', '-', '') = $${paramIdx + 1} OR
                  REPLACE(phone->>'number', '-', '') LIKE $${paramIdx + 2}
          )
        `);
        queryParams.push(search.trim(), normalizedSearchTerm, `${normalizedSearchTerm}%`);
        paramIdx += 3;
      } else {
        // Regular search: search all fields EXCEPT phone numbers when search looks like a phone pattern
        // This prevents false positives from phone numbers when searching for other content
        const isPhonePattern = /^\d{3,}$/.test(normalizedSearchTerm);
        
        if (isPhonePattern && normalizedSearchTerm.length >= 3) {
          // If search looks like a phone number, exclude phone search from regular search
          // This forces users to use the phone-only search button for phone number searches
          whereConditions.push(`
            (LOWER(ilc.company_name) LIKE $${paramIdx} OR
             LOWER(ilc.contact_names) LIKE $${paramIdx} OR
             LOWER(ilc.emails) LIKE $${paramIdx})
          `);
          queryParams.push(searchTerm);
          paramIdx += 1;
        } else {
          // For non-phone patterns, search all fields including phone numbers
          let phoneSearchConditions = [];
          
          if (normalizedSearchTerm.length >= 3) {
            // Exact match for formatted phone number (e.g., "623-288-5625")
            phoneSearchConditions.push(`phone->>'number' = $${paramIdx + 1}`);
            // Exact match for normalized phone number (e.g., "6232885625")
            phoneSearchConditions.push(`REPLACE(phone->>'number', '-', '') = $${paramIdx + 2}`);
            
            // Intelligent partial matching: search for numbers that START with the pattern
            // This ensures we only match area codes and prefixes, not random digits in the middle
            phoneSearchConditions.push(`REPLACE(phone->>'number', '-', '') LIKE $${paramIdx + 3}`);
          }
          
          const phoneSearchClause = phoneSearchConditions.length > 0 
            ? `OR EXISTS (SELECT 1 FROM jsonb_array_elements(ilc.phone_numbers::jsonb) AS phone WHERE ${phoneSearchConditions.join(' OR ')})`
            : '';
          
          whereConditions.push(`
            (LOWER(ilc.company_name) LIKE $${paramIdx} OR
             LOWER(ilc.contact_names) LIKE $${paramIdx} OR
             LOWER(ilc.emails) LIKE $${paramIdx} ${phoneSearchClause})
          `);
          
          // Add parameters for phone search
          queryParams.push(searchTerm);
          if (normalizedSearchTerm.length >= 3) {
            queryParams.push(search.trim(), normalizedSearchTerm, `${normalizedSearchTerm}%`);
            paramIdx += 4;
          } else {
            paramIdx += 1;
          }
        }
      }
    }

    // Filter conditions
    if (myClaims) {
      whereConditions.push(`ilc.user_id = $${paramIdx}`);
      queryParams.push(decoded.userId);
      paramIdx++;
    }

    if (unclaimed) {
      whereConditions.push(`ilc.user_id IS NULL`);
    }

    if (hasPhone) {
      whereConditions.push(`ilc.phone_numbers != '[]' AND ilc.phone_numbers != 'null' AND ilc.phone_numbers != ''`);
    }

    if (hasEmail) {
      whereConditions.push(`ilc.emails != '[]' AND ilc.emails != 'null' AND ilc.emails != ''`);
    }

    if (hasDeals) {
      whereConditions.push(`ilc.deal_urls != '[]' AND ilc.deal_urls != 'null' AND ilc.deal_urls != ''`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const limitParam = `$${paramIdx}`;
    const offsetParam = `$${paramIdx + 1}`;
    queryParams.push(limit + 1, offset);

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
        u.username as claimed_by_username,
        l.notes as notes
      FROM investor_lift_companies ilc
      LEFT JOIN users u ON ilc.user_id = u.id
      LEFT JOIN leads l ON l.deal_id = ilc.id AND l.user_id = $1
      ${whereClause}
      ORDER BY ilc.created_at DESC
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `;

    const rows = await db.all(query, queryParams) as CompanyRow[];

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
        notes: row.notes,
        // Add a unique compound key for React
        unique_key: `${row.id}-${page}-${index}`
      };
    });

    return NextResponse.json({
      companies: formattedCompanies,
      has_more: hasMore,
      page,
      total_returned: formattedCompanies.length
    });

  } catch (error) {
    console.error('Outreach companies API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}