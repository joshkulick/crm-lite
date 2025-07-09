import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { pool } from '@/lib/db';

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

interface Company {
  company_name: string;
  contact_names: string[];
  deal_urls: string[];
  phone_numbers: PhoneNumber[];
  emails: Email[];
}

interface ConsolidationStats {
  total_companies: number;
  total_original_records: number;
  consolidation_ratio: number;
  companies_with_phone: number;
  companies_with_email: number;
  total_unique_phones: number;
  total_unique_emails: number;
}

interface UploadData {
  consolidation_stats: ConsolidationStats;
  consolidated_data: Company[];
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
    const uploadData: UploadData = await request.json();

    // Validate the data structure
    if (!uploadData.consolidation_stats || !uploadData.consolidated_data) {
      return NextResponse.json(
        { error: 'Invalid data format. Missing consolidation_stats or consolidated_data.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(uploadData.consolidated_data)) {
      return NextResponse.json(
        { error: 'consolidated_data must be an array' },
        { status: 400 }
      );
    }

    const totalCompanies = uploadData.consolidated_data.length;

    if (totalCompanies === 0) {
      return NextResponse.json(
        { error: 'No companies found in the data' },
        { status: 400 }
      );
    }

    // Get a client from the pool for transaction
    const client = await pool.connect();

    try {
      // Start transaction
      await client.query('BEGIN');

      let insertedCount = 0;
      let errorCount = 0;

      // Prepare the insert statement (user_id should be NULL for unclaimed companies)
      const insertQuery = `
        INSERT INTO investor_lift_companies (
          company_name, 
          contact_names, 
          deal_urls, 
          phone_numbers, 
          emails, 
          user_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;

      // Process each company
      for (const company of uploadData.consolidated_data) {
        try {
          // Validate required fields
          if (!company.company_name) {
            console.warn('Skipping company with missing name');
            errorCount++;
            continue;
          }

          // Convert arrays to JSON strings for storage
          const contactNamesJson = JSON.stringify(company.contact_names || []);
          const dealUrlsJson = JSON.stringify(company.deal_urls || []);
          const phoneNumbersJson = JSON.stringify(company.phone_numbers || []);
          const emailsJson = JSON.stringify(company.emails || []);

          // Execute the insert with NULL user_id (unclaimed)
          await client.query(insertQuery, [
            company.company_name,
            contactNamesJson,
            dealUrlsJson,
            phoneNumbersJson,
            emailsJson,
            null  // NULL user_id means unclaimed
          ]);

          insertedCount++;

        } catch (companyError) {
          console.error('Error inserting company:', company.company_name, companyError);
          errorCount++;
        }
      }

      if (insertedCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Failed to insert any companies' },
          { status: 500 }
        );
      }

      // Commit transaction
      await client.query('COMMIT');

      if (errorCount > 0) {
        console.warn(`Upload completed with ${errorCount} errors out of ${totalCompanies} companies`);
      }

      return NextResponse.json({
        message: 'Upload completed successfully',
        stats: {
          total_processed: totalCompanies,
          successfully_inserted: insertedCount,
          errors: errorCount,
          consolidation_stats: uploadData.consolidation_stats
        }
      });

    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      console.error('Error in upload transaction:', error);
      
      return NextResponse.json(
        { error: 'Failed to process upload' },
        { status: 500 }
      );
    } finally {
      // Release the client back to pool
      client.release();
    }

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: 'Server error processing upload' },
      { status: 500 }
    );
  }
}