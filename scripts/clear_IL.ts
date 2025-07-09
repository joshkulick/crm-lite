#!/usr/bin/env tsx
/**
 * Script to clear the investor_lift_companies table
 * Usage: npx tsx scripts/clear-companies.ts
 */

import { Pool } from 'pg';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    const envVars = envFile.split('\n');
    
    envVars.forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, '');
        process.env[key.trim()] = cleanValue;
      }
    });
    
    console.log('✅ Loaded environment variables from .env.local');
  } else {
    console.log('⚠️  .env.local file not found');
  }
}

// Load environment variables first
loadEnvFile();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function clearCompaniesTable() {
  try {
    console.log('🔍 Checking current state of investor_lift_companies table...\n');

    // Get current counts
    const countResult = await pool.query('SELECT COUNT(*) as total FROM investor_lift_companies');
    const claimedResult = await pool.query('SELECT COUNT(*) as claimed FROM investor_lift_companies WHERE user_id IS NOT NULL');
    
    const totalCompanies = parseInt(countResult.rows[0].total);
    const claimedCompanies = parseInt(claimedResult.rows[0].claimed);
    const unclaimedCompanies = totalCompanies - claimedCompanies;

    console.log(`📊 Current Status:`);
    console.log(`   Total companies: ${totalCompanies}`);
    console.log(`   Claimed companies: ${claimedCompanies}`);
    console.log(`   Unclaimed companies: ${unclaimedCompanies}\n`);

    if (totalCompanies === 0) {
      console.log('✅ Table is already empty. Nothing to clear.');
      return;
    }

    // Warning and confirmation
    console.log('⚠️  WARNING: This will permanently delete ALL companies from the investor_lift_companies table!');
    console.log('⚠️  This action CANNOT be undone!');
    
    if (claimedCompanies > 0) {
      console.log(`⚠️  This will also remove ${claimedCompanies} claimed companies from users' leads!\n`);
    } else {
      console.log('');
    }

    const confirmation1 = await askQuestion('Are you sure you want to proceed? Type "yes" to continue: ');
    
    if (confirmation1.toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled.');
      return;
    }

    const confirmation2 = await askQuestion('This is your final warning. Type "DELETE ALL COMPANIES" to proceed: ');
    
    if (confirmation2 !== 'DELETE ALL COMPANIES') {
      console.log('❌ Operation cancelled.');
      return;
    }

    console.log('\n🗑️  Starting deletion process...');

    // Get a client for transaction
    const client = await pool.connect();

    try {
      // Start transaction
      await client.query('BEGIN');

      console.log('   1. Clearing claimed leads from leads table...');
      
      // First, delete all claimed leads from the leads table
      const deletedLeadsResult = await client.query(
        "DELETE FROM leads WHERE account_type = 'investor_lift_claimed'"
      );
      
      const deletedLeads = deletedLeadsResult.rowCount || 0;
      console.log(`   ✅ Removed ${deletedLeads} claimed leads from leads table`);

      console.log('   2. Clearing investor_lift_companies table...');
      
      // Then, clear the entire investor_lift_companies table
      const deletedCompaniesResult = await client.query('DELETE FROM investor_lift_companies');
      
      const deletedCompanies = deletedCompaniesResult.rowCount || 0;
      console.log(`   ✅ Removed ${deletedCompanies} companies from investor_lift_companies table`);

      // Commit transaction
      await client.query('COMMIT');
      
      console.log('\n✅ Successfully cleared all data!');
      console.log(`   📊 Summary:`);
      console.log(`      - Removed ${deletedCompanies} companies`);
      console.log(`      - Removed ${deletedLeads} claimed leads`);
      console.log(`      - Database is now ready for fresh data upload\n`);

    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      console.error('❌ Error during deletion:', error);
      throw error;
    } finally {
      // Release client
      client.release();
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('🧹 Clear Investor Lift Companies Script');
  console.log('=====================================\n');

  // Check if DATABASE_URL is loaded
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not found!');
    console.log('💡 Make sure you have a .env.local file with DATABASE_URL set.');
    console.log('💡 Example: DATABASE_URL="postgresql://username:password@localhost:5432/database"');
    process.exit(1);
  }

  console.log('📡 Using DATABASE_URL:', process.env.DATABASE_URL.replace(/:[^:@]*@/, ':****@'));

  try {
    // Test database connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    await clearCompaniesTable();

  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.log('\n💡 Common issues:');
    console.log('   - PostgreSQL server not running locally');
    console.log('   - Incorrect DATABASE_URL in .env.local');
    console.log('   - Database credentials are wrong');
    console.log('   - Database does not exist');
    process.exit(1);
  } finally {
    rl.close();
    await pool.end();
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n❌ Operation cancelled by user.');
  rl.close();
  pool.end();
  process.exit(0);
});

// Run the script
main();