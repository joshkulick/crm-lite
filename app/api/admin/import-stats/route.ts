import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface ImportStatsRow {
  total_companies: number;
  companies_with_phones: number;
  companies_with_emails: number;
  last_import_date: string | null;
  first_import_date: string | null;
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

    // Query to calculate stats from the unified Investor Lift table
    const query = `
      SELECT 
        COUNT(*) as total_companies,
        SUM(
          CASE 
            WHEN phone_numbers != '[]' AND phone_numbers IS NOT NULL 
            THEN 1 
            ELSE 0 
          END
        ) as companies_with_phones,
        SUM(
          CASE 
            WHEN emails != '[]' AND emails IS NOT NULL 
            THEN 1 
            ELSE 0 
          END
        ) as companies_with_emails,
        MAX(created_at) as last_import_date,
        MIN(created_at) as first_import_date
      FROM investor_lift_companies
    `;

    const row = await db.get(query) as ImportStatsRow | undefined;

    // Return stats or default values if no data exists
    const stats = row || {
      total_companies: 0,
      companies_with_phones: 0,
      companies_with_emails: 0,
      last_import_date: null,
      first_import_date: null
    };

    return NextResponse.json({
      total_companies: Number(stats.total_companies) || 0,
      companies_with_phones: Number(stats.companies_with_phones) || 0,
      companies_with_emails: Number(stats.companies_with_emails) || 0,
      last_import_date: stats.last_import_date,
      first_import_date: stats.first_import_date
    });

  } catch (error) {
    console.error('Import stats API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}