/*
  # Resort Dynamic Pricing & Booking Schema

  ## Overview
  Complete database schema for multi-resort booking system with dynamic pricing,
  meal plans, seasonal rates, overhead allocation, and payment tracking.

  ## New Tables

  ### 1. `resorts`
  Core resort information
  - `id` (uuid, primary key)
  - `name` (text, required) - Resort name
  - `currency` (text, default "RM") - Currency code

  ### 2. `room_types`
  Room categories per resort with pricing multipliers
  - `id` (uuid, primary key)
  - `resort_id` (uuid, foreign key) - Links to resorts
  - `code` (text) - Room code (SEA, POOL, GARDEN, WALK, FOREST)
  - `name` (text, required) - Display name
  - `multiplier` (decimal, default 1.00) - Pricing multiplier
  - `order_index` (integer, default 0) - Display order
  - `is_active` (boolean, default true)

  ### 3. `meal_plans`
  Meal plan offerings per resort
  - `id` (uuid, primary key)
  - `resort_id` (uuid, foreign key)
  - `code` (text) - Plan code (BO, LO, DO, HT, SU, FB, FBA, FBB)
  - `name` (text, required)
  - `price_adult` (decimal, default 0)
  - `price_child` (decimal, default 0)
  - `cost_adult` (decimal, default 0)
  - `cost_child` (decimal, default 0)
  - `is_active` (boolean, default true)

  ### 4. `overheads`
  Monthly overhead costs and allocation rules
  - `id` (uuid, primary key)
  - `resort_id` (uuid, foreign key)
  - `month` (date, required) - First day of month
  - `overhead_monthly` (decimal, required)
  - `overhead_daily` (decimal, nullable)
  - `overhead_per_room_day` (decimal, nullable)
  - `allocation_mode` (enum: per_room_day | fixed_per_package)
  - `fixed_per_package` (decimal, nullable)
  - `notes` (text, nullable)

  ### 5. `season_settings`
  Seasonal pricing rules and surcharges per resort
  - `id` (uuid, primary key)
  - `resort_id` (uuid, foreign key)
  - Multipliers and surcharge percentages

  ### 6. `season_assignments`
  Daily season and holiday assignments
  - `id` (uuid, primary key)
  - `resort_id` (uuid, foreign key)
  - `date` (date, required)
  - `season` (enum: low | mid | high, default mid)
  - `is_holiday` (boolean, default false)
  - UNIQUE constraint on (resort_id, date)

  ### 7. `pricing_configs`
  Component costs and prices per resort and year

  ### 8. `packages`
  Package presets (Room+Breakfast, Fullboard, etc.)

  ### 9. `bookings`
  Guest bookings with pricing snapshots

  ### 10. `payments`
  Payment transactions linked to bookings

  ## Security
  - Enable RLS on all tables
  - Authenticated users can read resort data
  - Admins can perform all operations

  ## Indexes
  - Foreign keys indexed for performance
  - Date ranges and lookups optimized
*/

-- Create enum types
DO $$ BEGIN
  CREATE TYPE allocation_mode AS ENUM ('per_room_day', 'fixed_per_package');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE season_type AS ENUM ('low', 'mid', 'high');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE boat_cost_source AS ENUM ('resort', 'vendor');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE activity_variant AS ENUM ('none', '3i', '5i', '8i');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_type AS ENUM ('unpaid', 'partial', 'paid', 'overpaid', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash', 'bank_transfer', 'card', 'FPX', 'QR', 'OTA');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_type AS ENUM ('deposit', 'balance', 'full', 'adjustment', 'refund');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE txn_status AS ENUM ('pending', 'cleared', 'failed', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Drop old tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS pricing_configs CASCADE;
DROP TABLE IF EXISTS season_assignments CASCADE;
DROP TABLE IF EXISTS season_settings CASCADE;
DROP TABLE IF EXISTS overheads CASCADE;
DROP TABLE IF EXISTS meal_plans CASCADE;
DROP TABLE IF EXISTS room_types CASCADE;
DROP TABLE IF EXISTS resorts CASCADE;

-- Create resorts table
CREATE TABLE resorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  currency text DEFAULT 'RM',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE resorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view resorts"
  ON resorts FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage resorts"
  ON resorts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Create room_types table
CREATE TABLE room_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  multiplier decimal(10,4) DEFAULT 1.00,
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_room_types_resort ON room_types(resort_id);
CREATE INDEX idx_room_types_active ON room_types(resort_id, is_active);

ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active room types"
  ON room_types FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage room types"
  ON room_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Create meal_plans table
CREATE TABLE meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  price_adult decimal(10,2) DEFAULT 0,
  price_child decimal(10,2) DEFAULT 0,
  cost_adult decimal(10,2) DEFAULT 0,
  cost_child decimal(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_meal_plans_resort ON meal_plans(resort_id);

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active meal plans"
  ON meal_plans FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage meal plans"
  ON meal_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Create overheads table
CREATE TABLE overheads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  month date NOT NULL,
  overhead_monthly decimal(12,2) NOT NULL,
  overhead_daily decimal(12,2),
  overhead_per_room_day decimal(12,2),
  allocation_mode allocation_mode DEFAULT 'per_room_day',
  fixed_per_package decimal(12,2),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_overheads_resort_month ON overheads(resort_id, month);

ALTER TABLE overheads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view overheads"
  ON overheads FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage overheads"
  ON overheads FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Create season_settings table
CREATE TABLE season_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  mult_low decimal(5,2) DEFAULT 0.90,
  mult_mid decimal(5,2) DEFAULT 1.00,
  mult_high decimal(5,2) DEFAULT 1.30,
  surcharge_weekend_pct decimal(5,2) DEFAULT 5,
  surcharge_holiday_pct decimal(5,2) DEFAULT 15,
  surcharge_occ_high_pct decimal(5,2) DEFAULT 10,
  surcharge_last_minute_pct decimal(5,2) DEFAULT 5,
  occ_threshold_pct decimal(5,2) DEFAULT 80,
  profit_margin_pct decimal(5,2) DEFAULT 25,
  round_to_rm5 boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_season_settings_resort ON season_settings(resort_id);

ALTER TABLE season_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view season settings"
  ON season_settings FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage season settings"
  ON season_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Create season_assignments table
CREATE TABLE season_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  date date NOT NULL,
  season season_type DEFAULT 'mid',
  is_holiday boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(resort_id, date)
);

CREATE INDEX idx_season_assignments_resort_date ON season_assignments(resort_id, date);

ALTER TABLE season_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view season assignments"
  ON season_assignments FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage season assignments"
  ON season_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Create pricing_configs table
CREATE TABLE pricing_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  year integer NOT NULL,
  pax_adult integer DEFAULT 2,
  pax_child integer DEFAULT 0,
  pax_infant integer DEFAULT 0,
  price_room decimal(10,2) DEFAULT 0,
  cost_room decimal(10,2) DEFAULT 0,
  price_boat_adult decimal(10,2) DEFAULT 0,
  price_boat_child decimal(10,2) DEFAULT 0,
  cost_boat_adult decimal(10,2) DEFAULT 0,
  cost_boat_child decimal(10,2) DEFAULT 0,
  cost_boat_vendor_adult decimal(10,2) DEFAULT 0,
  cost_boat_vendor_child decimal(10,2) DEFAULT 0,
  boat_cost_source boat_cost_source DEFAULT 'resort',
  price_activities_3i decimal(10,2) DEFAULT 0,
  cost_activities_3i decimal(10,2) DEFAULT 0,
  price_activities_5i decimal(10,2) DEFAULT 0,
  cost_activities_5i decimal(10,2) DEFAULT 0,
  price_activities_8i decimal(10,2) DEFAULT 0,
  cost_activities_8i decimal(10,2) DEFAULT 0,
  price_bbq decimal(10,2) DEFAULT 0,
  cost_bbq decimal(10,2) DEFAULT 0,
  price_candle decimal(10,2) DEFAULT 0,
  cost_candle decimal(10,2) DEFAULT 0,
  price_honeymoon decimal(10,2) DEFAULT 0,
  cost_honeymoon decimal(10,2) DEFAULT 0,
  overhead_mode allocation_mode DEFAULT 'per_room_day',
  overhead_fixed_per_package decimal(10,2),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_pricing_configs_resort_year ON pricing_configs(resort_id, year);

ALTER TABLE pricing_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pricing configs"
  ON pricing_configs FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage pricing configs"
  ON pricing_configs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Create packages table
CREATE TABLE packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  name text NOT NULL,
  meal_plan_id uuid REFERENCES meal_plans(id) ON DELETE SET NULL,
  include_room boolean DEFAULT true,
  include_meals boolean DEFAULT false,
  include_boat boolean DEFAULT false,
  activity_variant activity_variant DEFAULT 'none',
  include_bbq boolean DEFAULT false,
  include_candle boolean DEFAULT false,
  include_honeymoon boolean DEFAULT false,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_packages_resort ON packages(resort_id);
CREATE INDEX idx_packages_meal_plan ON packages(meal_plan_id);

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active packages"
  ON packages FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage packages"
  ON packages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Create bookings table
CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now(),
  check_in date NOT NULL,
  check_out date NOT NULL,
  nights integer,
  room_type_id uuid NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
  package_id uuid REFERENCES packages(id) ON DELETE SET NULL,
  meal_plan_id uuid REFERENCES meal_plans(id) ON DELETE SET NULL,
  pax_adult integer DEFAULT 2,
  pax_child integer DEFAULT 0,
  pax_infant integer DEFAULT 0,
  guest_name text,
  nationality text,
  email text,
  phone text,
  price_total decimal(12,2) DEFAULT 0,
  cost_total decimal(12,2) DEFAULT 0,
  profit_total decimal(12,2) DEFAULT 0,
  season_snapshot jsonb,
  status booking_status DEFAULT 'pending',
  paid_total decimal(12,2) DEFAULT 0,
  balance_due decimal(12,2) DEFAULT 0,
  payment_status payment_status_type DEFAULT 'unpaid',
  updated_at timestamptz DEFAULT now(),
  CHECK (check_out > check_in)
);

CREATE INDEX idx_bookings_resort ON bookings(resort_id);
CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_room_type ON bookings(room_type_id);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bookings"
  ON bookings FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage bookings"
  ON bookings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Create payments table
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE RESTRICT,
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  txn_date date NOT NULL,
  amount decimal(12,2) NOT NULL,
  currency text DEFAULT 'RM',
  method payment_method DEFAULT 'cash',
  type payment_type DEFAULT 'deposit',
  status txn_status DEFAULT 'cleared',
  gateway_ref text,
  notes text,
  posted_by text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_payments_resort ON payments(resort_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_date ON payments(txn_date);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view payments"
  ON payments FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage payments"
  ON payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Create trigger to update bookings updated_at
CREATE OR REPLACE FUNCTION update_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bookings_timestamp
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_bookings_updated_at();

-- Create trigger to calculate nights on bookings
CREATE OR REPLACE FUNCTION calculate_booking_nights()
RETURNS TRIGGER AS $$
BEGIN
  NEW.nights = NEW.check_out - NEW.check_in;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_nights_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_booking_nights();