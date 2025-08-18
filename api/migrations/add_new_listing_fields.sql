-- Migration to add new fields to listings table
-- Add new columns to support enhanced listing features

-- Add AI-generated description field
ALTER TABLE listings 
ADD COLUMN ai_description TEXT;

-- Add availability information
ALTER TABLE listings 
ADD COLUMN availability VARCHAR(256);

-- Add original URL field (renamed from source_id usage)
ALTER TABLE listings 
ADD COLUMN original_url VARCHAR(1024);

-- Create index for original_url for faster lookups
CREATE INDEX IF NOT EXISTS idx_listings_original_url ON listings(original_url);

-- Update existing records to populate original_url from source_id where applicable
UPDATE listings 
SET original_url = source_id 
WHERE source_id IS NOT NULL 
  AND source_id LIKE 'http%'
  AND original_url IS NULL;

