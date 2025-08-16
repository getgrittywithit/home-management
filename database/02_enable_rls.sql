-- STEP 2: Enable RLS on all your tables
-- Copy and paste each line separately into Supabase SQL Editor
-- If a table doesn't exist, you'll get an error - just skip that one

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;