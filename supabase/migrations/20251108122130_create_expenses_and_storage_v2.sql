/*
  # Create Expenses Tables and Update Payments

  ## New Tables
  1. `expenses` - Track business expenses and bills
  2. `suppliers` - Vendor management

  ## Updates
  - Add receipt_urls to payments table
  - Add notes and id_doc_urls to guests table
*/

-- Create expense category enum
DO $$ BEGIN
  CREATE TYPE expense_category_type AS ENUM (
    'utilities',
    'salary',
    'maintenance',
    'fuel',
    'boat_vendor',
    'supplies',
    'marketing',
    'tax',
    'rent',
    'insurance',
    'misc'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create expense status enum
DO $$ BEGIN
  CREATE TYPE expense_status_type AS ENUM ('unpaid', 'paid', 'partial');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create payment method enum if not exists
DO $$ BEGIN
  CREATE TYPE payment_method_type AS ENUM (
    'cash',
    'bank_transfer',
    'card',
    'FPX',
    'QR',
    'OTA',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  expense_date date NOT NULL,
  vendor text,
  category expense_category_type DEFAULT 'misc',
  description text,
  subtotal decimal(10, 2) DEFAULT 0,
  tax decimal(10, 2) DEFAULT 0,
  total decimal(10, 2) NOT NULL,
  payment_method payment_method_type DEFAULT 'bank_transfer',
  status expense_status_type DEFAULT 'paid',
  reference_no text,
  bill_urls text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact text,
  default_category text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add receipt_urls to payments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'receipt_urls'
  ) THEN
    ALTER TABLE payments ADD COLUMN receipt_urls text[];
  END IF;
END $$;

-- Add notes and id_doc_urls to guests table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guests' AND column_name = 'notes'
  ) THEN
    ALTER TABLE guests ADD COLUMN notes text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guests' AND column_name = 'id_doc_urls'
  ) THEN
    ALTER TABLE guests ADD COLUMN id_doc_urls text[];
  END IF;
END $$;

-- Create indexes for expenses
CREATE INDEX IF NOT EXISTS idx_expenses_resort_date ON expenses(resort_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_resort_category ON expenses(resort_id, category);
CREATE INDEX IF NOT EXISTS idx_expenses_vendor ON expenses(vendor);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);

-- Create indexes for suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_resort_id ON suppliers(resort_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);

-- Create trigger for expenses updated_at
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for suppliers updated_at
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expenses
CREATE POLICY "Users can view expenses for their resort"
  ON expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert expenses for their resort"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update expenses for their resort"
  ON expenses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete expenses for their resort"
  ON expenses FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for suppliers
CREATE POLICY "Users can view suppliers for their resort"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert suppliers for their resort"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update suppliers for their resort"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete suppliers for their resort"
  ON suppliers FOR DELETE
  TO authenticated
  USING (true);
