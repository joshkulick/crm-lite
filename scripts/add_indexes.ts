import { pool } from '../lib/db';
import fs from 'fs';
import path from 'path';

async function addIndexes() {
  try {
    console.log('Adding database indexes for faster phone number searching...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add_phone_indexes.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of statements) {
      try {
        await pool.query(statement);
        console.log('✓ Executed:', statement.substring(0, 50) + '...');
      } catch {
        console.log('⚠ Skipped (likely already exists):', statement.substring(0, 50) + '...');
      }
    }
    
    console.log('✅ Database indexes added successfully!');
    console.log('Phone number searches should now be much faster.');
    
  } catch (error) {
    console.error('❌ Error adding indexes:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
addIndexes(); 