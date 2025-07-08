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

    // Process the upload
    return new Promise<NextResponse>((resolve) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        let insertedCount = 0;
        let errorCount = 0;
        const totalCompanies = uploadData.consolidated_data.length;

        if (totalCompanies === 0) {
          db.run('ROLLBACK');
          resolve(NextResponse.json(
            { error: 'No companies found in the data' },
            { status: 400 }
          ));
          return;
        }

        // Prepare the insert statement
        const insertQuery = `
          INSERT INTO investor_lift_companies (
            company_name, 
            contact_names, 
            deal_urls, 
            phone_numbers, 
            emails, 
            user_id
          ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        const stmt = db.prepare(insertQuery);

        // Insert each company
        uploadData.consolidated_data.forEach((company) => {
          try {
            // Validate required fields
            if (!company.company_name) {
              console.warn('Skipping company with missing name');
              errorCount++;
              return;
            }

            // Convert arrays to JSON strings for storage
            const contactNamesJson = JSON.stringify(company.contact_names || []);
            const dealUrlsJson = JSON.stringify(company.deal_urls || []);
            const phoneNumbersJson = JSON.stringify(company.phone_numbers || []);
            const emailsJson = JSON.stringify(company.emails || []);

            stmt.run([
              company.company_name,
              contactNamesJson,
              dealUrlsJson,
              phoneNumbersJson,
              emailsJson,
              decoded.userId
            ], function(err: Error | null) {
              if (err) {
                console.error('Error inserting company:', company.company_name, err);
                errorCount++;
              } else {
                insertedCount++;
              }

              // Check if we've processed all companies
              if (insertedCount + errorCount === totalCompanies) {
                stmt.finalize();

                if (errorCount > 0) {
                  console.warn(`Upload completed with ${errorCount} errors out of ${totalCompanies} companies`);
                }

                if (insertedCount === 0) {
                  db.run('ROLLBACK');
                  resolve(NextResponse.json(
                    { error: 'Failed to insert any companies' },
                    { status: 500 }
                  ));
                } else {
                  db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                      console.error('Commit error:', commitErr);
                      resolve(NextResponse.json(
                        { error: 'Failed to commit transaction' },
                        { status: 500 }
                      ));
                    } else {
                      resolve(NextResponse.json({
                        message: 'Upload completed successfully',
                        stats: {
                          total_processed: totalCompanies,
                          successfully_inserted: insertedCount,
                          errors: errorCount,
                          consolidation_stats: uploadData.consolidation_stats
                        }
                      }));
                    }
                  });
                }
              }
            });
          } catch (companyError) {
            console.error('Error processing company:', company.company_name, companyError);
            errorCount++;
            
            // Check if we've processed all companies
            if (insertedCount + errorCount === totalCompanies) {
              stmt.finalize();
              db.run('ROLLBACK');
              resolve(NextResponse.json(
                { error: 'Failed to process companies' },
                { status: 500 }
              ));
            }
          }
        });
      });
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: 'Server error processing upload' },
      { status: 500 }
    );
  }
}