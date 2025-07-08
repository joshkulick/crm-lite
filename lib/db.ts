import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.sqlite');

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initTables();
  }
});

function initTables() {
  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create leads table for basic CRM data
  db.run(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deal_id INTEGER,
      contact_name TEXT,
      company TEXT,
      account_type TEXT,
      phone_numbers TEXT,
      emails TEXT,
      point_of_contact TEXT,
      preferred_contact_method TEXT CHECK (preferred_contact_method IN ('call', 'email', 'text')),
      preferred_contact_value TEXT,
      notes TEXT,  -- ✅ Unified notes column
      status TEXT DEFAULT 'new',
      next_follow_up DATETIME,
      pipeline TEXT DEFAULT 'Not Outreached' CHECK (pipeline IN ('Not Outreached', 'Outreached', 'Sent Info', 'Demo', 'Trial', 'Customer', 'Not Interested')),
      scrape_timestamp DATETIME,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Add new columns to existing leads table if they don't exist
  db.run(`ALTER TABLE leads ADD COLUMN next_follow_up DATETIME`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.log('Note: next_follow_up column already exists or could not be added');
    }
  });

  db.run(`ALTER TABLE leads ADD COLUMN pipeline TEXT DEFAULT 'Not Outreached'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.log('Note: pipeline column already exists or could not be added');
    }
  });

  // ====== INVESTOR LIFT SCRAPE PLUGIN TABLES ======
  
  // Single unified table for all Investor Lift company data
  db.run(`
    CREATE TABLE IF NOT EXISTS investor_lift_companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      contact_names TEXT, -- JSON array of contact names
      deal_urls TEXT, -- JSON array of deal URLs
      phone_numbers TEXT, -- JSON array of phone objects with associated_deal_urls
      emails TEXT, -- JSON array of email objects with associated_deal_urls
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ====== END INVESTOR LIFT PLUGIN TABLES ======
}