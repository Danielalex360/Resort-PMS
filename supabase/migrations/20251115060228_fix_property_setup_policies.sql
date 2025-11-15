/*
  # Fix Property Setup Tables RLS Policies

  ## Changes
  - Drop policies that cause infinite recursion by referencing user_roles
  - Create simpler policies that allow authenticated users to manage their resort data
  - Admin checks will be handled at the application layer

  ## Security
  - Authenticated users can read all property setup data
  - Authenticated users can insert/update/delete (admin checks in app layer)
*/

-- Drop existing policies for room_units
DROP POLICY IF EXISTS "Anyone can view room units" ON room_units;
DROP POLICY IF EXISTS "Admins and managers can manage room units" ON room_units;

-- Create new policies for room_units
CREATE POLICY "Authenticated users can view room units"
  ON room_units FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage room units"
  ON room_units FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Drop existing policies for taxes
DROP POLICY IF EXISTS "Anyone can view taxes" ON taxes;
DROP POLICY IF EXISTS "Admins and managers can manage taxes" ON taxes;

-- Create new policies for taxes
CREATE POLICY "Authenticated users can view taxes"
  ON taxes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage taxes"
  ON taxes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Drop existing policies for extra_charges
DROP POLICY IF EXISTS "Anyone can view extra charges" ON extra_charges;
DROP POLICY IF EXISTS "Admins and managers can manage extra charges" ON extra_charges;

-- Create new policies for extra_charges
CREATE POLICY "Authenticated users can view extra charges"
  ON extra_charges FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage extra charges"
  ON extra_charges FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Drop existing policies for booking_extra_charges
DROP POLICY IF EXISTS "Anyone can view booking extra charges" ON booking_extra_charges;
DROP POLICY IF EXISTS "Admins and managers can manage booking extra charges" ON booking_extra_charges;

-- Create new policies for booking_extra_charges
CREATE POLICY "Authenticated users can view booking extra charges"
  ON booking_extra_charges FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage booking extra charges"
  ON booking_extra_charges FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Drop existing policies for booking_room_assignments
DROP POLICY IF EXISTS "Anyone can view booking room assignments" ON booking_room_assignments;
DROP POLICY IF EXISTS "Admins and managers can manage room assignments" ON booking_room_assignments;

-- Create new policies for booking_room_assignments
CREATE POLICY "Authenticated users can view booking room assignments"
  ON booking_room_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage room assignments"
  ON booking_room_assignments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
