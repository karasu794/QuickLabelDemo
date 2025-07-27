-- 住所録テーブルの作成
CREATE TABLE address_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  company_name TEXT,
  phone_number TEXT,
  country_code CHAR(2) NOT NULL,
  postal_code TEXT,
  state_code TEXT,
  city TEXT,
  address1 TEXT,
  address2 TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (Row Level Security) を有効化
ALTER TABLE address_book ENABLE ROW LEVEL SECURITY;

-- ユーザーは自身のデータのみ操作できるポリシーを作成
CREATE POLICY "Users can manage their own address book."
ON address_book
FOR ALL
USING (auth.uid() = user_id); 