-- STEP 3: Remove overly permissive policies
-- Copy and paste each line separately

DROP POLICY IF EXISTS "Allow all operations on profiles" ON profiles;