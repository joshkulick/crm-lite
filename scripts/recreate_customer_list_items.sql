DROP TABLE IF EXISTS customer_list_items;

CREATE TABLE customer_list_items (
  id SERIAL PRIMARY KEY,
  list_id INTEGER NOT NULL,
  lead_id INTEGER NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (list_id) REFERENCES customer_lists(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  UNIQUE(list_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_list_items_list_id ON customer_list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_customer_list_items_lead_id ON customer_list_items(lead_id);
CREATE INDEX IF NOT EXISTS idx_customer_list_items_added_at ON customer_list_items(added_at DESC); 