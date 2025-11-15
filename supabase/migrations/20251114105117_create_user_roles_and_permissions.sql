/*
  # Create User Roles and Permissions System

  1. New Tables
    - `user_roles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `resort_id` (text, references resorts)
      - `role` (text) - 'admin' or 'account'
      - `created_at` (timestamptz)
      - `created_by` (uuid, references auth.users)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_roles` table
    - Add policy for admins to manage users
    - Add policy for users to read their own roles

  3. Notes
    - Admin role: Full access to all features
    - Account role: Limited access to accounting/reporting features
    - Users can have multiple roles for different resorts
    - Only existing admins can create new users with roles
*/

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resort_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'account')),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, resort_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_resort_id ON user_roles(resort_id);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own roles
CREATE POLICY "Users can view own roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Admins can view all roles for their resorts
CREATE POLICY "Admins can view all roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.resort_id = user_roles.resort_id
      AND ur.role = 'admin'
    )
  );

-- Policy: Admins can insert new user roles
CREATE POLICY "Admins can create user roles"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.resort_id = user_roles.resort_id
      AND ur.role = 'admin'
    )
  );

-- Policy: Admins can update user roles
CREATE POLICY "Admins can update user roles"
  ON user_roles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.resort_id = user_roles.resort_id
      AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.resort_id = user_roles.resort_id
      AND ur.role = 'admin'
    )
  );

-- Policy: Admins can delete user roles
CREATE POLICY "Admins can delete user roles"
  ON user_roles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.resort_id = user_roles.resort_id
      AND ur.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_roles_updated_at_trigger ON user_roles;
CREATE TRIGGER update_user_roles_updated_at_trigger
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_roles_updated_at();

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(check_user_id uuid, check_resort_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = check_user_id
    AND resort_id = check_resort_id
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
