const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function recreateCustomerListItemsTable() {
  try {
    console.log('Dropping customer_list_items table if it exists...');
    await pool.query('DROP TABLE IF EXISTS customer_list_items;');

    console.log('Creating customer_list_items table...');
    await pool.query(`
      CREATE TABLE customer_list_items (
        id SERIAL PRIMARY KEY,
        list_id INTEGER NOT NULL,
        lead_id INTEGER NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (list_id) REFERENCES customer_lists(id) ON DELETE CASCADE,
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
        UNIQUE(list_id, lead_id)
      );
    `);

    console.log('Creating indexes...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_customer_list_items_list_id ON customer_list_items(list_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_customer_list_items_lead_id ON customer_list_items(lead_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_customer_list_items_added_at ON customer_list_items(added_at DESC);');

    console.log('✅ customer_list_items table recreated successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error recreating customer_list_items table:', error);
    process.exit(1);
  }
}

recreateCustomerListItemsTable(); 