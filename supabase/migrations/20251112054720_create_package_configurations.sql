/*
  # Package Configuration System

  1. New Tables
    - `package_configs`
      - `id` (uuid, primary key)
      - `resort_id` (uuid, foreign key to resorts)
      - `package_code` (text) - Short code like 'RB', 'RBB', 'RB3I', 'FB', 'FB3I'
      - `package_name` (text) - Display name
      - `is_active` (boolean) - Whether package is enabled
      - `sort_order` (integer) - Display order
      - `includes_room` (boolean) - Includes room cost
      - `includes_breakfast` (boolean) - Includes breakfast
      - `includes_lunch` (boolean) - Includes lunch
      - `includes_dinner` (boolean) - Includes dinner
      - `includes_boat` (boolean) - Includes boat transfer
      - `includes_activities_3i` (boolean) - Includes 3 Islands activity
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `package_configs` table
    - Add policies for authenticated users to manage packages
*/

CREATE TABLE IF NOT EXISTS package_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  package_code text NOT NULL,
  package_name text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  includes_room boolean DEFAULT true,
  includes_breakfast boolean DEFAULT false,
  includes_lunch boolean DEFAULT false,
  includes_dinner boolean DEFAULT false,
  includes_boat boolean DEFAULT false,
  includes_activities_3i boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(resort_id, package_code)
);

ALTER TABLE package_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view packages"
  ON package_configs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert packages"
  ON package_configs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update packages"
  ON package_configs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete packages"
  ON package_configs FOR DELETE
  TO authenticated
  USING (true);

-- Insert default packages for existing resorts
INSERT INTO package_configs (resort_id, package_code, package_name, sort_order, includes_room, includes_breakfast, includes_lunch, includes_dinner, includes_boat, includes_activities_3i, is_active)
SELECT 
  id as resort_id,
  'RB' as package_code,
  'Room & Breakfast' as package_name,
  1 as sort_order,
  true, true, false, false, true, false, true
FROM resorts
ON CONFLICT (resort_id, package_code) DO NOTHING;

INSERT INTO package_configs (resort_id, package_code, package_name, sort_order, includes_room, includes_breakfast, includes_lunch, includes_dinner, includes_boat, includes_activities_3i, is_active)
SELECT 
  id as resort_id,
  'RBB' as package_code,
  'Room + Breakfast + Boat' as package_name,
  2 as sort_order,
  true, true, false, false, true, false, true
FROM resorts
ON CONFLICT (resort_id, package_code) DO NOTHING;

INSERT INTO package_configs (resort_id, package_code, package_name, sort_order, includes_room, includes_breakfast, includes_lunch, includes_dinner, includes_boat, includes_activities_3i, is_active)
SELECT 
  id as resort_id,
  'RB3I' as package_code,
  'Room + Breakfast + 3 Islands' as package_name,
  3 as sort_order,
  true, true, false, false, true, true, true
FROM resorts
ON CONFLICT (resort_id, package_code) DO NOTHING;

INSERT INTO package_configs (resort_id, package_code, package_name, sort_order, includes_room, includes_breakfast, includes_lunch, includes_dinner, includes_boat, includes_activities_3i, is_active)
SELECT 
  id as resort_id,
  'FB' as package_code,
  'Fullboard (B,L,D) + Boat' as package_name,
  4 as sort_order,
  true, true, true, true, true, false, true
FROM resorts
ON CONFLICT (resort_id, package_code) DO NOTHING;

INSERT INTO package_configs (resort_id, package_code, package_name, sort_order, includes_room, includes_breakfast, includes_lunch, includes_dinner, includes_boat, includes_activities_3i, is_active)
SELECT 
  id as resort_id,
  'FB3I' as package_code,
  'Fullboard + 3 Islands' as package_name,
  5 as sort_order,
  true, true, true, true, true, true, true
FROM resorts
ON CONFLICT (resort_id, package_code) DO NOTHING;