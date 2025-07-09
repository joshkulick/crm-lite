import { Pool } from 'pg';

// Use environment variable for database connection
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create PostgreSQL connection pool
export const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Create a db object that mimics the SQLite interface for easier migration
export const db = {
  // For direct queries
  query: (text: string, params?: any[]) => pool.query(text, params),
  
  // SQLite-compatible methods for existing code
  run: async (sql: string, params?: any[]) => {
    const result = await pool.query(sql, params);
    return {
      ...result,
      rows: result.rows,
      rowCount: result.rowCount
    };
  },
  
  get: async (sql: string, params?: any[]) => {
    const result = await pool.query(sql, params);
    return result.rows[0];
  },
  
  all: async (sql: string, params?: any[]) => {
    const result = await pool.query(sql, params);
    return result.rows;
  },

  // For prepared statements (if needed)
  prepare: (sql: string) => ({
    run: async (params?: any[]) => {
      const result = await pool.query(sql, params);
      return { lastID: result.rows[0]?.id, changes: result.rowCount };
    },
    get: async (params?: any[]) => {
      const result = await pool.query(sql, params);
      return result.rows[0];
    },
    all: async (params?: any[]) => {
      const result = await pool.query(sql, params);
      return result.rows;
    },
    finalize: () => {} // No-op for PostgreSQL
  })
};

// Test connection and initialize tables
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err);
    return;
  }
  
  console.log('✅ Connected to PostgreSQL database');
  release();
  initTables();
});

async function initTables() {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create leads table for basic CRM data with all columns included
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        deal_id INTEGER,
        contact_name TEXT,
        company TEXT,
        account_type TEXT,
        phone_numbers TEXT,
        emails TEXT,
        point_of_contact TEXT,
        preferred_contact_method TEXT CHECK (preferred_contact_method IN ('call', 'email', 'text')),
        preferred_contact_value TEXT,
        notes TEXT,
        status TEXT DEFAULT 'new',
        next_follow_up TIMESTAMP,
        pipeline TEXT DEFAULT 'Not Outreached' CHECK (pipeline IN ('Not Outreached', 'Outreached', 'Sent Info', 'Demo', 'Trial', 'Customer', 'Not Interested')),
        scrape_timestamp TIMESTAMP,
        user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // ====== INVESTOR LIFT SCRAPE PLUGIN TABLES ======
    
    // Single unified table for all Investor Lift company data
    await pool.query(`
      CREATE TABLE IF NOT EXISTS investor_lift_companies (
        id SERIAL PRIMARY KEY,
        company_name TEXT NOT NULL,
        contact_names TEXT, -- JSON array of contact names
        deal_urls TEXT, -- JSON array of deal URLs
        phone_numbers TEXT, -- JSON array of phone objects with associated_deal_urls
        emails TEXT, -- JSON array of email objects with associated_deal_urls
        user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // ====== END INVESTOR LIFT PLUGIN TABLES ======
    
    // ====== CUSTOMER LISTS TABLES ======
    
    // Create customer_lists table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_lists (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create customer_list_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_list_items (
        id SERIAL PRIMARY KEY,
        list_id INTEGER NOT NULL,
        lead_id INTEGER NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (list_id) REFERENCES customer_lists(id) ON DELETE CASCADE,
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
        UNIQUE(list_id, lead_id)
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_lists_user_id ON customer_lists(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_list_items_list_id ON customer_list_items(list_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_list_items_lead_id ON customer_list_items(lead_id)
    `);

    // ====== END CUSTOMER LISTS TABLES ======
    
    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('Error initializing tables:', error);
  }
}