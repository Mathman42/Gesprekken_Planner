/*
  # Create admin user in Supabase Auth
  
  1. Purpose
    - Creates the admin user account in Supabase Auth system
    - Sets default password that must be changed on first login
    - Ensures admin has proper authentication for RLS policies
  
  2. Security
    - User created with confirmed email
    - Default password: KempenhorstAdmin2024!
    - Admin should change this password after first login
*/

-- Create admin user using Supabase Auth
-- This is done using a DO block to check if user exists first
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if admin user already exists in auth.users
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'admin@kempenhorst.nl';
  
  -- Only create if doesn't exist
  IF admin_user_id IS NULL THEN
    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@kempenhorst.nl',
      crypt('KempenhorstAdmin2024!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
    
    RAISE NOTICE 'Admin user created successfully';
  ELSE
    RAISE NOTICE 'Admin user already exists';
  END IF;
END $$;
