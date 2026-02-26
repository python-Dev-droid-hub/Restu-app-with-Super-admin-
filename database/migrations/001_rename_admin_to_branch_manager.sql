-- Database Migration: Rename ADMIN to BRANCH_MANAGER and add SUPER_ADMIN role
-- Run this migration to update the database schema for the new role system

-- Step 1: Update users.role enum to include new roles
-- First, we need to handle existing data, then modify the constraint

-- Check current enum values and update if needed
-- Note: This syntax may vary depending on your database (PostgreSQL, MySQL, etc.)

-- For PostgreSQL:
-- ALTER TYPE user_role RENAME TO user_role_old;
-- CREATE TYPE user_role AS ENUM ('CUSTOMER', 'RIDER', 'BRANCH_MANAGER', 'WAITER', 'CHEF', 'SUPER_ADMIN');
-- ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::text::user_role;
-- DROP TYPE user_role_old;

-- For MySQL (more flexible with ENUM):
ALTER TABLE users 
MODIFY COLUMN role VARCHAR(30) CHECK (
  role IN ('CUSTOMER', 'RIDER', 'BRANCH_MANAGER', 'WAITER', 'CHEF', 'SUPER_ADMIN')
);

-- Step 2: Rename existing ADMIN users to BRANCH_MANAGER
UPDATE users 
SET role = 'BRANCH_MANAGER' 
WHERE role = 'ADMIN';

-- Step 3: Create SUPER_ADMIN user (system admin)
-- Note: Replace 'hashed_password_here' with actual bcrypt hash
-- Generate hash with: bcrypt.hashSync('SuperAdmin123!', 10)

INSERT INTO users (
  id, 
  email, 
  display_name, 
  role, 
  assigned_branch_id, 
  password_hash,
  phone_number, 
  email_verified, 
  created_at,
  updated_at
) VALUES (
  'super-admin-1',
  'admin@restaurant.com',
  'Super Admin',
  'SUPER_ADMIN',
  NULL,  -- SUPER_ADMIN has no assigned_branch_id (monitors all)
  '$2b$10$w5Y3Zt3DJ5u2ZrHLJku5qOLbO5z/tyrLxXq1uITz.nlvkrBLrpEyC',  -- bcrypt hash of: Admin123!
  '+92-300-1234567',
  TRUE,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Step 3b: Create BRANCH_MANAGER user (manager)
INSERT INTO users (
  id, 
  email, 
  display_name, 
  role, 
  assigned_branch_id, 
  password_hash,
  phone_number, 
  email_verified, 
  created_at,
  updated_at
) VALUES (
  'branch-manager-1',
  'manager@restaurant.com',
  'Branch Manager',
  'BRANCH_MANAGER',
  NULL,  -- Will be assigned to a specific branch
  '$2b$10$RguuwMMB4hC.2UPiIrT27Ohy7.p/xAn8aaViaxX6B.08yMyN3tida',  -- bcrypt hash of: manager123
  '+92-300-1234568',
  TRUE,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Step 4: Ensure all BRANCH_MANAGER users have an assigned_branch_id
-- Find managers without branch assignment
SELECT id, email, display_name 
FROM users 
WHERE role = 'BRANCH_MANAGER' 
AND (assigned_branch_id IS NULL OR assigned_branch_id = '');

-- Step 5: Add index for faster role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_assigned_branch_id ON users(assigned_branch_id);

-- Step 6: Add comment explaining the role system
COMMENT ON TABLE users IS 'User roles: CUSTOMER, RIDER, BRANCH_MANAGER, WAITER, CHEF, SUPER_ADMIN. BRANCH_MANAGER requires assigned_branch_id.';

-- Verification queries:
-- Check role distribution
SELECT role, COUNT(*) as count FROM users GROUP BY role;

-- Check BRANCH_MANAGER assignments
SELECT 
  u.id,
  u.email,
  u.display_name,
  u.role,
  u.assigned_branch_id,
  b.name as branch_name
FROM users u
LEFT JOIN branches b ON u.assigned_branch_id = b.id
WHERE u.role = 'BRANCH_MANAGER';

-- Check SUPER_ADMIN exists
SELECT id, email, display_name, role 
FROM users 
WHERE role = 'SUPER_ADMIN';

-- Rollback script (if needed):
-- UPDATE users SET role = 'ADMIN' WHERE role = 'BRANCH_MANAGER';
-- DELETE FROM users WHERE role = 'SUPER_ADMIN';
