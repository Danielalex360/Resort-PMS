/*
  # Create Accounting System and Reports Infrastructure

  1. Enums
    - income_category_type: Room, F&B, Activities, Add-ons, Taxes, etc.
    - expense_category_type: Refunds, Discounts, OTA Commission
    - document_type: Invoice, Receipt, Folio, Registration Form, Cancellation Record
    - payment_shift: Morning, Evening, Night

  2. Tables
    - accounting_categories: Define all income/expense categories per resort
    - booking_line_items: Granular charge tracking (room, meals, activities, add-ons)
    - documents: Store all generated documents (invoices, receipts, folios)
    - daily_audits: Night audit records
    - document_sequences: Track daily numbering sequences

  3. Security
    - RLS enabled on all tables
    - Policies for authenticated users

  4. Notes
    - All line items must have a category for proper accounting
    - Documents auto-generate with daily sequence numbers
    - Night audit locks previous day and generates reports
*/

-- Enums
DO $$ BEGIN
  CREATE TYPE income_category_type AS ENUM (
    'room_sales',
    'meals_fb',
    'activities',
    'addons',
    'tourism_tax',
    'surcharges',
    'boat_transfers',
    'late_checkout',
    'miscellaneous'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE expense_category_type AS ENUM (
    'refunds',
    'discounts',
    'ota_commission',
    'adjustments'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM (
    'invoice',
    'receipt',
    'folio',
    'registration_form',
    'cancellation_record',
    'refund_receipt'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_shift AS ENUM (
    'morning',
    'evening',
    'night'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Accounting Categories (resort_id is text to match user_roles)
CREATE TABLE IF NOT EXISTS accounting_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id text NOT NULL,
  category_name text NOT NULL,
  category_type text NOT NULL,
  is_income boolean DEFAULT true NOT NULL,
  description text,
  is_active boolean DEFAULT true NOT NULL,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE accounting_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view resort accounting categories"
  ON accounting_categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.resort_id = accounting_categories.resort_id
      AND user_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage accounting categories"
  ON accounting_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.resort_id = accounting_categories.resort_id
      AND user_roles.user_id = auth.uid()
      AND user_roles.role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.resort_id = accounting_categories.resort_id
      AND user_roles.user_id = auth.uid()
      AND user_roles.role IN ('owner', 'manager')
    )
  );

-- Booking Line Items (granular charges)
CREATE TABLE IF NOT EXISTS booking_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id text NOT NULL,
  booking_id uuid NOT NULL,
  category_id uuid REFERENCES accounting_categories(id) NOT NULL,
  item_date date NOT NULL,
  description text NOT NULL,
  quantity decimal(10,2) DEFAULT 1 NOT NULL,
  unit_price decimal(10,2) NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE booking_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view resort line items"
  ON booking_line_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.resort_id = booking_line_items.resort_id
      AND user_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage line items"
  ON booking_line_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.resort_id = booking_line_items.resort_id
      AND user_roles.user_id = auth.uid()
      AND user_roles.role IN ('owner', 'manager', 'frontdesk')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.resort_id = booking_line_items.resort_id
      AND user_roles.user_id = auth.uid()
      AND user_roles.role IN ('owner', 'manager', 'frontdesk')
    )
  );

-- Document Sequences (for daily numbering)
CREATE TABLE IF NOT EXISTS document_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id text NOT NULL,
  document_type document_type NOT NULL,
  sequence_date date NOT NULL,
  last_number int DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(resort_id, document_type, sequence_date)
);

ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view resort document sequences"
  ON document_sequences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.resort_id = document_sequences.resort_id
      AND user_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage document sequences"
  ON document_sequences FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.resort_id = document_sequences.resort_id
      AND user_roles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.resort_id = document_sequences.resort_id
      AND user_roles.user_id = auth.uid()
    )
  );

-- Documents (invoices, receipts, folios, etc.)
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id text NOT NULL,
  booking_id uuid,
  payment_id uuid,
  document_type document_type NOT NULL,
  document_number text NOT NULL,
  document_date date NOT NULL,
  guest_name text NOT NULL,
  amount decimal(10,2),
  pdf_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  generated_by uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(resort_id, document_number)
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view resort documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.resort_id = documents.resort_id
      AND user_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can create documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.resort_id = documents.resort_id
      AND user_roles.user_id = auth.uid()
    )
  );

-- Daily Audits (Night Audit)
CREATE TABLE IF NOT EXISTS daily_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id text NOT NULL,
  audit_date date NOT NULL,
  rooms_occupied int DEFAULT 0,
  rooms_available int DEFAULT 0,
  occupancy_percent decimal(5,2) DEFAULT 0,
  adr decimal(10,2) DEFAULT 0,
  revpar decimal(10,2) DEFAULT 0,
  room_revenue decimal(10,2) DEFAULT 0,
  fb_revenue decimal(10,2) DEFAULT 0,
  activities_revenue decimal(10,2) DEFAULT 0,
  addons_revenue decimal(10,2) DEFAULT 0,
  boat_revenue decimal(10,2) DEFAULT 0,
  taxes_collected decimal(10,2) DEFAULT 0,
  refunds decimal(10,2) DEFAULT 0,
  discounts decimal(10,2) DEFAULT 0,
  ota_commission decimal(10,2) DEFAULT 0,
  net_revenue decimal(10,2) DEFAULT 0,
  gross_revenue decimal(10,2) DEFAULT 0,
  arrivals_count int DEFAULT 0,
  departures_count int DEFAULT 0,
  inhouse_guests int DEFAULT 0,
  no_shows_count int DEFAULT 0,
  cancellations_count int DEFAULT 0,
  is_locked boolean DEFAULT false,
  audited_by uuid,
  audited_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(resort_id, audit_date)
);

ALTER TABLE daily_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view resort daily audits"
  ON daily_audits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.resort_id = daily_audits.resort_id
      AND user_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage daily audits"
  ON daily_audits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.resort_id = daily_audits.resort_id
      AND user_roles.user_id = auth.uid()
      AND user_roles.role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.resort_id = daily_audits.resort_id
      AND user_roles.user_id = auth.uid()
      AND user_roles.role IN ('owner', 'manager')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_line_items_booking ON booking_line_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_line_items_category ON booking_line_items(category_id);
CREATE INDEX IF NOT EXISTS idx_line_items_date ON booking_line_items(item_date);
CREATE INDEX IF NOT EXISTS idx_documents_booking ON documents(booking_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(document_date);
CREATE INDEX IF NOT EXISTS idx_daily_audits_date ON daily_audits(audit_date);
CREATE INDEX IF NOT EXISTS idx_daily_audits_resort ON daily_audits(resort_id, audit_date);