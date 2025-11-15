-- ============================================
-- RESORT PMS - FIRST TIME SETUP SCRIPT
-- ============================================
-- Run this in Supabase SQL Editor after deployment
-- Replace the placeholders with your actual values
-- ============================================

-- STEP 1: Find your user ID
-- After you create your account, run this to get your user ID:
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Copy your user ID from the result above


-- STEP 2: Create your resort
-- Replace 'YOUR_USER_ID_HERE' with the ID from Step 1
-- Replace 'Your Resort Name' with your actual resort name

INSERT INTO resorts (name, currency, owner_id, created_at)
VALUES (
  'Alun Alun Island Resort',  -- Change this to your resort name
  'MYR',                        -- Change currency if needed (USD, SGD, etc.)
  'YOUR_USER_ID_HERE',          -- REPLACE with your user ID from Step 1
  now()
)
RETURNING id, name, currency;

-- Copy the resort ID from the result above


-- STEP 3: Assign yourself as Owner/Admin
-- Replace 'YOUR_USER_ID_HERE' with your user ID
-- Replace 'YOUR_RESORT_ID_HERE' with the resort ID from Step 2

INSERT INTO user_roles (user_id, resort_id, role, assigned_by, assigned_at)
VALUES (
  'YOUR_USER_ID_HERE',    -- REPLACE with your user ID
  'YOUR_RESORT_ID_HERE',  -- REPLACE with your resort ID
  'owner',
  'YOUR_USER_ID_HERE',    -- Same as user_id (self-assigned)
  now()
);


-- STEP 4: Verify setup
-- This should show your user with 'owner' role
SELECT
  ur.id,
  u.email,
  r.name as resort_name,
  ur.role,
  ur.assigned_at
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
JOIN resorts r ON r.id = ur.resort_id
WHERE u.id = 'YOUR_USER_ID_HERE';


-- ============================================
-- STEP 5 (OPTIONAL): Create sample room types
-- ============================================
-- Replace 'YOUR_RESORT_ID_HERE' with your resort ID

INSERT INTO room_types (resort_id, name, code, base_price, max_adults, max_children, total_units, created_at)
VALUES
  ('YOUR_RESORT_ID_HERE', 'Deluxe Room', 'DLX', 250.00, 2, 1, 10, now()),
  ('YOUR_RESORT_ID_HERE', 'Suite', 'STE', 450.00, 2, 2, 5, now()),
  ('YOUR_RESORT_ID_HERE', 'Villa', 'VIL', 650.00, 4, 2, 3, now());


-- ============================================
-- STEP 6 (OPTIONAL): Create sample meal plans
-- ============================================
-- Replace 'YOUR_RESORT_ID_HERE' with your resort ID

INSERT INTO meal_plans (resort_id, code, name, price_adult, price_child, description, is_active, created_at)
VALUES
  ('YOUR_RESORT_ID_HERE', 'RO', 'Room Only', 0, 0, 'Room only, no meals included', true, now()),
  ('YOUR_RESORT_ID_HERE', 'BB', 'Bed & Breakfast', 35, 20, 'Includes breakfast', true, now()),
  ('YOUR_RESORT_ID_HERE', 'HB', 'Half Board', 70, 40, 'Includes breakfast and dinner', true, now()),
  ('YOUR_RESORT_ID_HERE', 'FB', 'Full Board', 100, 60, 'Includes all three meals', true, now()),
  ('YOUR_RESORT_ID_HERE', 'AI', 'All Inclusive', 150, 90, 'All meals, snacks, and drinks', true, now());


-- ============================================
-- STEP 7 (OPTIONAL): Create property setup record
-- ============================================
-- Replace 'YOUR_RESORT_ID_HERE' with your resort ID

INSERT INTO property_setup (
  resort_id,
  property_name,
  address,
  city,
  state_province,
  country,
  postal_code,
  phone,
  email,
  website,
  tax_id,
  check_in_time,
  check_out_time,
  currency_code,
  timezone,
  default_tax_rate,
  created_at,
  updated_at
)
VALUES (
  'YOUR_RESORT_ID_HERE',
  'Alun Alun Island Resort',          -- Your property name
  '123 Paradise Beach',                -- Address
  'Langkawi',                          -- City
  'Kedah',                             -- State/Province
  'Malaysia',                          -- Country
  '07000',                             -- Postal code
  '+60 4-123-4567',                    -- Phone
  'info@alunalunresort.com',          -- Email
  'https://alunalunresort.com',       -- Website
  'MY1234567890',                      -- Tax ID
  '15:00:00',                          -- Check-in time (3 PM)
  '12:00:00',                          -- Check-out time (12 PM)
  'MYR',                               -- Currency code
  'Asia/Kuala_Lumpur',                -- Timezone
  6.00,                                -- Default tax rate (6% for Malaysia)
  now(),
  now()
);


-- ============================================
-- STEP 8: Verify everything is set up
-- ============================================

-- Check resorts
SELECT id, name, currency, owner_id FROM resorts;

-- Check room types
SELECT id, resort_id, name, code, base_price FROM room_types;

-- Check meal plans
SELECT id, resort_id, code, name, price_adult FROM meal_plans;

-- Check your role
SELECT
  u.email,
  r.name as resort,
  ur.role
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
JOIN resorts r ON r.id = ur.resort_id;


-- ============================================
-- DONE! 🎉
-- ============================================
-- You can now log in to your app and start using it!
-- Default login: The email/password you signed up with
-- ============================================
