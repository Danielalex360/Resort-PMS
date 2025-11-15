/*
  # Create Cancellation and Modification Tables

  1. cancellation_policies table
    - Define cancellation rules per resort
    - Days before check-in, charge percentage

  2. cancellation_logs table
    - Complete audit trail of cancellations
    - Refund tracking

  3. booking_modifications table
    - Track all changes to bookings
    - Field-level audit trail

  4. Security
    - Enable RLS with proper type casting
    - resort_id in user_roles is TEXT type

  5. Indexes
    - Performance indexes
*/

-- Create cancellation_policies table
CREATE TABLE IF NOT EXISTS cancellation_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  days_before_checkin integer NOT NULL,
  charge_percentage integer NOT NULL CHECK (charge_percentage >= 0 AND charge_percentage <= 100),
  is_non_refundable boolean DEFAULT false,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'cancellation_policies_resort_id_name_key'
  ) THEN
    ALTER TABLE cancellation_policies ADD CONSTRAINT cancellation_policies_resort_id_name_key UNIQUE(resort_id, name);
  END IF;
END $$;

ALTER TABLE cancellation_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cancellation policies for their resort"
  ON cancellation_policies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.resort_id::uuid = cancellation_policies.resort_id
      AND ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert cancellation policies"
  ON cancellation_policies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.resort_id::uuid = cancellation_policies.resort_id
      AND ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can update cancellation policies"
  ON cancellation_policies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.resort_id::uuid = cancellation_policies.resort_id
      AND ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete cancellation policies"
  ON cancellation_policies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.resort_id::uuid = cancellation_policies.resort_id
      AND ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- Create cancellation_logs table
CREATE TABLE IF NOT EXISTS cancellation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  cancellation_reason cancellation_reason NOT NULL,
  cancellation_notes text,
  refund_amount numeric(10,2) DEFAULT 0,
  refund_method payment_method,
  refund_reference text,
  refund_proof_url text,
  cancelled_by uuid REFERENCES auth.users(id),
  cancelled_at timestamptz DEFAULT now(),
  original_total numeric(10,2),
  amount_paid numeric(10,2)
);

ALTER TABLE cancellation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cancellation logs for their resort"
  ON cancellation_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.resort_id::uuid = cancellation_logs.resort_id
      AND ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create cancellation logs for their resort"
  ON cancellation_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.resort_id::uuid = cancellation_logs.resort_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'manager')
    )
  );

-- Create booking_modifications table
CREATE TABLE IF NOT EXISTS booking_modifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  modified_by uuid REFERENCES auth.users(id),
  modified_at timestamptz DEFAULT now()
);

ALTER TABLE booking_modifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view booking modifications"
  ON booking_modifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN user_roles ur ON ur.resort_id::uuid = b.resort_id
      WHERE b.id = booking_modifications.booking_id
      AND ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create booking modifications"
  ON booking_modifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cancellation_logs_booking ON cancellation_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_logs_resort ON cancellation_logs(resort_id);
CREATE INDEX IF NOT EXISTS idx_booking_modifications_booking ON booking_modifications(booking_id);

-- Insert default cancellation policies for existing resorts
INSERT INTO cancellation_policies (resort_id, name, description, days_before_checkin, charge_percentage, is_default)
SELECT 
  r.id,
  'Standard Policy',
  'Free cancellation 7+ days before check-in, 50% charge within 7 days, 100% charge within 3 days',
  7,
  50,
  true
FROM resorts r
WHERE NOT EXISTS (
  SELECT 1 FROM cancellation_policies cp WHERE cp.resort_id = r.id
);