-- Create receipt_cache table for managing PDF cache in Vercel Blob
-- This table tracks cached PDF files and their metadata

CREATE TABLE IF NOT EXISTS receipt_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('shipment', 'open_shipment')),
  blob_key VARCHAR(255) NOT NULL, -- Vercel Blob storage key
  blob_url TEXT, -- Optional: store the blob URL for quick access
  file_size BIGINT, -- File size in bytes
  content_hash VARCHAR(64), -- SHA-256 hash for integrity verification
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration time
  
  -- Ensure one cache entry per transaction
  UNIQUE(transaction_id, transaction_type),
  
  -- Indexes for efficient lookups
  INDEX idx_receipt_cache_transaction ON receipt_cache(transaction_id, transaction_type),
  INDEX idx_receipt_cache_blob_key ON receipt_cache(blob_key),
  INDEX idx_receipt_cache_expires_at ON receipt_cache(expires_at) WHERE expires_at IS NOT NULL
);

-- Add RLS (Row Level Security) policies
ALTER TABLE receipt_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access cache entries for their own transactions
CREATE POLICY "Users can access their own receipt cache" ON receipt_cache
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM shipments s 
      WHERE s.id = receipt_cache.transaction_id 
        AND s.user_id = auth.uid()
        AND receipt_cache.transaction_type = 'shipment'
    )
    OR
    EXISTS (
      SELECT 1 FROM open_shipments os 
      WHERE os.id = receipt_cache.transaction_id 
        AND os.user_id = auth.uid()
        AND receipt_cache.transaction_type = 'open_shipment'
    )
  );

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_receipt_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired cache entries
  DELETE FROM receipt_cache
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to invalidate cache for a specific transaction
CREATE OR REPLACE FUNCTION invalidate_receipt_cache(transaction_id_param UUID, transaction_type_param VARCHAR(20))
RETURNS BOOLEAN AS $$
DECLARE
  cache_record RECORD;
BEGIN
  -- Get the cache record before deletion for cleanup purposes
  SELECT * INTO cache_record
  FROM receipt_cache
  WHERE transaction_id = transaction_id_param AND transaction_type = transaction_type_param;
  
  -- Delete the cache entry
  DELETE FROM receipt_cache
  WHERE transaction_id = transaction_id_param AND transaction_type = transaction_type_param;
  
  -- Return true if a record was deleted
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_receipt_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER receipt_cache_updated_at_trigger
  BEFORE UPDATE ON receipt_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_receipt_cache_updated_at();