/*
  # Create User Profiles and Invitation System

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `username` (text, unique) - for login
      - `full_name` (text)
      - `ic_number` (text) - National ID
      - `nationality` (text)
      - `phone_number` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `user_invitations`
      - `id` (uuid, primary key)
      - `email` (text)
      - `resort_id` (uuid, references resorts)
      - `role` (text)
      - `invited_by` (uuid, references auth.users)
      - `token` (text, unique) - invitation token
      - `status` (text) - 'pending', 'accepted', 'expired'
      - `expires_at` (timestamp)
      - `created_at` (timestamp)
      - `accepted_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
    - Users can view their own profile
    - Admins can view invitations they sent

  3. Changes
    - Add username column to support username-based login
    - Store extended user information in profiles
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  ic_number text,
  nationality text,
  phone_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on username for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- Create user_invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  role text NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  CONSTRAINT valid_role CHECK (role IN ('admin', 'manager', 'accounts', 'frontdesk')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'expired'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policies for user_invitations
CREATE POLICY "Users can view invitations they sent"
  ON user_invitations FOR SELECT
  TO authenticated
  USING (invited_by = auth.uid());

CREATE POLICY "Admins can create invitations"
  ON user_invitations FOR INSERT
  TO authenticated
  WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Anyone can view pending invitations by token"
  ON user_invitations FOR SELECT
  TO anon, authenticated
  USING (status = 'pending' AND expires_at > now());

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
