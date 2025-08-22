-- Create receipt_numbers table for managing receipt number generation
-- This table stores receipt numbers in YYMMDD0XXXX format with daily sequence management

CREATE TABLE IF NOT EXISTS receipt_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_key VARCHAR(6) NOT NULL, -- YYMMDD format
  sequence_number INTEGER NOT NULL,
  receipt_number VARCHAR(12) NOT NULL UNIQUE, -- YYMMDD0XXXX format
  transaction_id UUID NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('shipment', 'open_shipment')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique sequence per date
  UNIQUE(date_key, sequence_number),
  
  -- Index for efficient lookups
  INDEX idx_receipt_numbers_date_key ON receipt_numbers(date_key),
  INDEX idx_receipt_numbers_transaction ON receipt_numbers(transaction_id, transaction_type),
  INDEX idx_receipt_numbers_receipt_number ON receipt_numbers(receipt_number)
);

-- Add RLS (Row Level Security) policies
ALTER TABLE receipt_numbers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access receipt numbers for their own transactions
CREATE POLICY "Users can access their own receipt numbers" ON receipt_numbers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM shipments s 
      WHERE s.id = receipt_numbers.transaction_id 
        AND s.user_id = auth.uid()
        AND receipt_numbers.transaction_type = 'shipment'
    )
    OR
    EXISTS (
      SELECT 1 FROM open_shipments os 
      WHERE os.id = receipt_numbers.transaction_id 
        AND os.user_id = auth.uid()
        AND receipt_numbers.transaction_type = 'open_shipment'
    )
  );

-- Function to get next sequence number for a given date
CREATE OR REPLACE FUNCTION get_next_receipt_sequence(date_key_param VARCHAR(6))
RETURNS INTEGER AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  -- Get the next sequence number for the given date
  SELECT COALESCE(MAX(sequence_number), 0) + 1
  INTO next_seq
  FROM receipt_numbers
  WHERE date_key = date_key_param;
  
  RETURN next_seq;
END;
$$ LANGUAGE plpgsql;

-- Function to generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number(transaction_id_param UUID, transaction_type_param VARCHAR(20))
RETURNS VARCHAR(12) AS $$
DECLARE
  date_key_val VARCHAR(6);
  sequence_num INTEGER;
  receipt_num VARCHAR(12);
BEGIN
  -- Generate date key in YYMMDD format
  date_key_val := TO_CHAR(NOW(), 'YYMMDD');
  
  -- Get next sequence number
  sequence_num := get_next_receipt_sequence(date_key_val);
  
  -- Generate receipt number in YYMMDD0XXXX format
  receipt_num := date_key_val || '0' || LPAD(sequence_num::TEXT, 4, '0');
  
  -- Insert the record
  INSERT INTO receipt_numbers (date_key, sequence_number, receipt_number, transaction_id, transaction_type)
  VALUES (date_key_val, sequence_num, receipt_num, transaction_id_param, transaction_type_param);
  
  RETURN receipt_num;
END;
$$ LANGUAGE plpgsql;