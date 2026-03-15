-- STEP 1: Check what tables you currently have
-- Copy and paste this into Supabase SQL Editor

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'RLS ON ✅' ELSE 'RLS OFF ❌' END as security_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;