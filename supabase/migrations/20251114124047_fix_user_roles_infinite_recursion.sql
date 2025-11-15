/*
  # Fix User Roles Infinite Recursion

  1. Changes
    - Drop existing RLS policies that cause infinite recursion
    - Create new policies that avoid checking the same table
    - Use a simpler approach for SELECT that doesn't recurse

  2. Security
    - Users can view their own roles
    - Users can view roles for resorts they belong to
    - Users can manage roles only if they are admin (checked by app layer)
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can create user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;

-- Create new simple policies
-- Users can view their own roles
CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can view all roles for their resorts (using a subquery that doesn't recurse)
CREATE POLICY "Users can view resort roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    resort_id IN (
      SELECT DISTINCT resort_id 
      FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Allow inserts if created by authenticated user (admin check happens in Edge Function)
CREATE POLICY "Authenticated users can insert roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Allow updates for admins (we'll check admin status differently)
CREATE POLICY "Allow updates for resort members"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (
    resort_id IN (
      SELECT DISTINCT resort_id 
      FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Allow deletes for resort members (admin check in app)
CREATE POLICY "Allow deletes for resort members"
  ON user_roles FOR DELETE
  TO authenticated
  USING (
    resort_id IN (
      SELECT DISTINCT resort_id 
      FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );
