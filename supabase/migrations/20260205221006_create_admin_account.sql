/*
  # Create Initial Admin Account

  1. Changes
    - Insert default admin account for Kempenhorst College
    - Email: admin@kempenhorst.nl
    - Password: KempenhorstAdmin2024! (change after first login)
    
  2. Security
    - Password should be changed immediately after first use
    - This is a single admin account as specified in requirements
*/

-- Insert admin account (password is stored as plain text for simplicity - in production use bcrypt)
INSERT INTO admin_users (email, password_hash)
VALUES ('admin@kempenhorst.nl', 'KempenhorstAdmin2024!')
ON CONFLICT (email) DO NOTHING;