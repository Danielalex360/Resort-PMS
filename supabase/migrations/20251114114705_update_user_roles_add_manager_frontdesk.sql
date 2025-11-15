/*
  # Update User Roles - Add Manager and Frontdesk

  1. Changes
    - Expand role check constraint to include 'manager' and 'frontdesk'
    - Keep all existing policies and functions
    - Add helper functions for permission checks

  2. Roles
    - admin: Full access to everything
    - manager: Everything except user management
    - accounts: Financial modules + read access
    - frontdesk: Bookings, guests, read prices

  3. Notes
    - Does not break existing admin/account roles
    - Backwards compatible
*/

-- Drop the existing check constraint
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Add new check constraint with all 4 roles
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check 
  CHECK (role IN ('admin', 'manager', 'accounts', 'frontdesk'));

-- Helper function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION user_has_role(check_user_id uuid, check_resort_id text, allowed_roles text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = check_user_id
    AND resort_id = check_resort_id
    AND role = ANY(allowed_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's role for a resort
CREATE OR REPLACE FUNCTION get_user_role(check_user_id uuid, check_resort_id text)
RETURNS text AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = check_user_id
  AND resort_id = check_resort_id
  LIMIT 1;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can manage users (admin only)
CREATE OR REPLACE FUNCTION can_manage_users(check_user_id uuid, check_resort_id text)
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

-- Helper function to check if user can modify pricing/setup (admin, manager)
CREATE OR REPLACE FUNCTION can_modify_setup(check_user_id uuid, check_resort_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = check_user_id
    AND resort_id = check_resort_id
    AND role IN ('admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can manage expenses (admin, manager, accounts)
CREATE OR REPLACE FUNCTION can_manage_expenses(check_user_id uuid, check_resort_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = check_user_id
    AND resort_id = check_resort_id
    AND role IN ('admin', 'manager', 'accounts')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can manage bookings (admin, manager, frontdesk)
CREATE OR REPLACE FUNCTION can_manage_bookings(check_user_id uuid, check_resort_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = check_user_id
    AND resort_id = check_resort_id
    AND role IN ('admin', 'manager', 'frontdesk')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
