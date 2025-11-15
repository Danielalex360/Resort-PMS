/*
  # Property Setup Tables - Room Units, Taxes, and Extra Charges

  ## Overview
  This migration creates tables for comprehensive property setup including individual room units/inventory,
  tax configuration following Malaysia tax compliance, and extra charges for products/services.

  ## New Tables

  ### 1. `room_units`
  Individual physical room inventory with room numbers/names
  - `id` (uuid, primary key)
  - `resort_id` (uuid, foreign key) - Links to resorts
  - `room_type_id` (uuid, foreign key) - Links to room_types
  - `unit_number` (text, required) - Room number/name (e.g., "101", "102", "Villa A")
  - `floor` (integer, nullable) - Floor number if applicable
  - `max_adults` (integer, default 2) - Maximum adults per room
  - `max_children` (integer, default 2) - Maximum children per room
  - `max_infants` (integer, default 1) - Maximum infants per room
  - `is_active` (boolean, default true) - Active status
  - `notes` (text, nullable) - Additional notes
  - UNIQUE constraint on (resort_id, unit_number)

  ### 2. `taxes`
  Tax configuration following Malaysia tax compliance
  - `id` (uuid, primary key)
  - `resort_id` (uuid, foreign key) - Links to resorts
  - `name` (text, required) - Tax name (e.g., "SST", "Tourism Tax")
  - `rate` (decimal, required) - Tax rate as percentage or fixed amount
  - `application_type` (enum) - How tax is applied: per_room, per_pax, per_night, per_total
  - `is_percentage` (boolean, default true) - True if rate is percentage, false if fixed amount
  - `apply_to_adults` (boolean, default true) - Apply to adult pax
  - `apply_to_children` (boolean, default false) - Apply to child pax
  - `is_active` (boolean, default true) - Active status
  - `display_order` (integer, default 0) - Display order
  - `notes` (text, nullable) - Additional notes

  ### 3. `extra_charges`
  Extra charges for products, activities, and services
  - `id` (uuid, primary key)
  - `resort_id` (uuid, foreign key) - Links to resorts
  - `name` (text, required) - Product/service name
  - `category` (text, nullable) - Category (e.g., "Activity", "F&B", "Amenity")
  - `price` (decimal, required) - Selling price
  - `cost` (decimal, default 0) - Cost price
  - `charge_type` (enum) - How it's charged: per_room, per_night, per_pax, per_product
  - `apply_to_adults` (boolean, default true) - Apply to adults
  - `apply_to_children` (boolean, default true) - Apply to children
  - `is_active` (boolean, default true) - Active status
  - `display_order` (integer, default 0) - Display order
  - `description` (text, nullable) - Product/service description
  - `notes` (text, nullable) - Internal notes

  ### 4. `booking_extra_charges`
  Junction table linking bookings to extra charges
  - `id` (uuid, primary key)
  - `booking_id` (uuid, foreign key) - Links to bookings
  - `extra_charge_id` (uuid, foreign key) - Links to extra_charges
  - `quantity` (integer, default 1) - Quantity
  - `unit_price` (decimal, required) - Price at time of booking
  - `unit_cost` (decimal, default 0) - Cost at time of booking
  - `total_price` (decimal, required) - Total price
  - `total_cost` (decimal, default 0) - Total cost
  - `notes` (text, nullable)

  ### 5. `booking_room_assignments`
  Links bookings to specific room units
  - `id` (uuid, primary key)
  - `booking_id` (uuid, foreign key) - Links to bookings
  - `room_unit_id` (uuid, foreign key) - Links to room_units
  - `assigned_at` (timestamptz, default now())
  - `assigned_by` (text, nullable) - User who assigned
  - UNIQUE constraint on (booking_id) - One room per booking for now

  ## Security
  - Enable RLS on all tables
  - Authenticated users can read data
  - Admin/Manager can perform all operations

  ## Indexes
  - Foreign keys indexed for performance
  - Unique constraints on room numbers
*/

-- Create enum types
DO $$ BEGIN
  CREATE TYPE tax_application_type AS ENUM ('per_room', 'per_pax', 'per_night', 'per_total');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE charge_type AS ENUM ('per_room', 'per_night', 'per_pax', 'per_product');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create room_units table
CREATE TABLE IF NOT EXISTS room_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  room_type_id uuid NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  unit_number text NOT NULL,
  floor integer,
  max_adults integer DEFAULT 2,
  max_children integer DEFAULT 2,
  max_infants integer DEFAULT 1,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(resort_id, unit_number)
);

CREATE INDEX IF NOT EXISTS idx_room_units_resort ON room_units(resort_id);
CREATE INDEX IF NOT EXISTS idx_room_units_room_type ON room_units(room_type_id);
CREATE INDEX IF NOT EXISTS idx_room_units_active ON room_units(resort_id, is_active);

ALTER TABLE room_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view room units"
  ON room_units FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins and managers can manage room units"
  ON room_units FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.resort_id = room_units.resort_id::text
      AND user_roles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.resort_id = room_units.resort_id::text
      AND user_roles.role IN ('admin', 'manager')
    )
  );

-- Create taxes table
CREATE TABLE IF NOT EXISTS taxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  name text NOT NULL,
  rate decimal(10,4) NOT NULL,
  application_type tax_application_type DEFAULT 'per_total',
  is_percentage boolean DEFAULT true,
  apply_to_adults boolean DEFAULT true,
  apply_to_children boolean DEFAULT false,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_taxes_resort ON taxes(resort_id);
CREATE INDEX IF NOT EXISTS idx_taxes_active ON taxes(resort_id, is_active);

ALTER TABLE taxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view taxes"
  ON taxes FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins and managers can manage taxes"
  ON taxes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.resort_id = taxes.resort_id::text
      AND user_roles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.resort_id = taxes.resort_id::text
      AND user_roles.role IN ('admin', 'manager')
    )
  );

-- Create extra_charges table
CREATE TABLE IF NOT EXISTS extra_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  price decimal(10,2) NOT NULL,
  cost decimal(10,2) DEFAULT 0,
  charge_type charge_type DEFAULT 'per_product',
  apply_to_adults boolean DEFAULT true,
  apply_to_children boolean DEFAULT true,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  description text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extra_charges_resort ON extra_charges(resort_id);
CREATE INDEX IF NOT EXISTS idx_extra_charges_active ON extra_charges(resort_id, is_active);
CREATE INDEX IF NOT EXISTS idx_extra_charges_category ON extra_charges(resort_id, category);

ALTER TABLE extra_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view extra charges"
  ON extra_charges FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins and managers can manage extra charges"
  ON extra_charges FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.resort_id = extra_charges.resort_id::text
      AND user_roles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.resort_id = extra_charges.resort_id::text
      AND user_roles.role IN ('admin', 'manager')
    )
  );

-- Create booking_extra_charges table
CREATE TABLE IF NOT EXISTS booking_extra_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  extra_charge_id uuid NOT NULL REFERENCES extra_charges(id) ON DELETE RESTRICT,
  quantity integer DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  unit_cost decimal(10,2) DEFAULT 0,
  total_price decimal(10,2) NOT NULL,
  total_cost decimal(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_extra_charges_booking ON booking_extra_charges(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_extra_charges_charge ON booking_extra_charges(extra_charge_id);

ALTER TABLE booking_extra_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view booking extra charges"
  ON booking_extra_charges FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins and managers can manage booking extra charges"
  ON booking_extra_charges FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN user_roles ON user_roles.resort_id = bookings.resort_id::text
      WHERE bookings.id = booking_extra_charges.booking_id
      AND user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager', 'frontdesk')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN user_roles ON user_roles.resort_id = bookings.resort_id::text
      WHERE bookings.id = booking_extra_charges.booking_id
      AND user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager', 'frontdesk')
    )
  );

-- Create booking_room_assignments table
CREATE TABLE IF NOT EXISTS booking_room_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  room_unit_id uuid NOT NULL REFERENCES room_units(id) ON DELETE RESTRICT,
  assigned_at timestamptz DEFAULT now(),
  assigned_by text,
  notes text,
  UNIQUE(booking_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_room_assignments_booking ON booking_room_assignments(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_room_assignments_room ON booking_room_assignments(room_unit_id);

ALTER TABLE booking_room_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view booking room assignments"
  ON booking_room_assignments FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins and managers can manage room assignments"
  ON booking_room_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN user_roles ON user_roles.resort_id = bookings.resort_id::text
      WHERE bookings.id = booking_room_assignments.booking_id
      AND user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager', 'frontdesk')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN user_roles ON user_roles.resort_id = bookings.resort_id::text
      WHERE bookings.id = booking_room_assignments.booking_id
      AND user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager', 'frontdesk')
    )
  );

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER update_room_units_modtime
    BEFORE UPDATE ON room_units
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_taxes_modtime
    BEFORE UPDATE ON taxes
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_extra_charges_modtime
    BEFORE UPDATE ON extra_charges
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
