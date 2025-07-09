-- Add indexes for faster phone number searching
-- This script should be run to optimize phone number searches

-- Create a GIN index on phone_numbers for JSON operations
CREATE INDEX IF NOT EXISTS idx_investor_lift_phone_numbers_gin 
ON investor_lift_companies USING GIN ((phone_numbers::jsonb));

-- Create a functional index for normalized phone numbers (without dashes)
CREATE INDEX IF NOT EXISTS idx_investor_lift_phone_normalized 
ON investor_lift_companies USING GIN (
  (SELECT array_agg(REPLACE(phone->>'number', '-', '')) 
   FROM jsonb_array_elements(phone_numbers::jsonb) AS phone)
);

-- Create an index on company_name for faster text search
CREATE INDEX IF NOT EXISTS idx_investor_lift_company_name 
ON investor_lift_companies (company_name);

-- Create an index on contact_names for faster text search
CREATE INDEX IF NOT EXISTS idx_investor_lift_contact_names 
ON investor_lift_companies USING GIN ((contact_names::jsonb));

-- Create an index on emails for faster text search
CREATE INDEX IF NOT EXISTS idx_investor_lift_emails 
ON investor_lift_companies USING GIN ((emails::jsonb));

-- Create an index on user_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_investor_lift_user_id 
ON investor_lift_companies (user_id);

-- Create an index on created_at for faster ordering
CREATE INDEX IF NOT EXISTS idx_investor_lift_created_at 
ON investor_lift_companies (created_at DESC); 