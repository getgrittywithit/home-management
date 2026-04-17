-- ============================================================================
-- Dispatch 94 — Parent Daily View & ADHD Command Center
-- Seeds weekly checklist + user settings for auto-archive.
-- ============================================================================

-- Seed parent weekly checklist (idempotent — check task_label + day)
INSERT INTO parent_weekly_checklist (parent_name, category, task_label, day_of_week, is_recurring, week_start)
SELECT v.parent_name, v.category, v.task_label, v.day_of_week, v.is_recurring,
       date_trunc('week', CURRENT_DATE)::date AS week_start
FROM (VALUES
  ('lola','household','Start Levi laundry','monday',TRUE),
  ('lola','finance','Check Copilot / bank balances','monday',TRUE),
  ('lola','homeschool','Print weekly lesson plans','monday',TRUE),
  ('lola','household','Meal prep check — defrost anything needed','monday',TRUE),
  ('lola','household','Lola laundry day','tuesday',TRUE),
  ('lola','school','Check Zoey grades / attendance (504)','tuesday',TRUE),
  ('lola','school','Check Kaylee grades / IEP notes','tuesday',TRUE),
  ('lola','household','Girls laundry (Kaylee+Ellie+Hannah)','wednesday',TRUE),
  ('lola','homeschool','Mid-week progress check — all 4 HS kids','wednesday',TRUE),
  ('lola','business','Triton invoice follow-ups','wednesday',TRUE),
  ('lola','household','Amos laundry day','thursday',TRUE),
  ('lola','medical','Check med supply — reorder if low','thursday',TRUE),
  ('lola','household','Grocery list review for weekend shop','thursday',TRUE),
  ('lola','household','Girls laundry (Kaylee+Ellie+Hannah)','friday',TRUE),
  ('lola','homeschool','Week wrap-up — log progress, update journey maps','friday',TRUE),
  ('lola','household','Zone check — walk through all 6 zones','friday',TRUE),
  ('lola','household','Zoey laundry + bed sheets / catch-up','saturday',TRUE),
  ('lola','household','Weekend grocery run','saturday',TRUE),
  ('lola','finance','Weekly expense review','saturday',TRUE),
  ('lola','household','Wyatt laundry + catch-up','sunday',TRUE),
  ('lola','homeschool','Plan next week lessons','sunday',TRUE),
  ('lola','household','Prep week-ahead calendar','sunday',TRUE)
) AS v(parent_name, category, task_label, day_of_week, is_recurring)
WHERE NOT EXISTS (
  SELECT 1 FROM parent_weekly_checklist
  WHERE parent_weekly_checklist.task_label = v.task_label
    AND parent_weekly_checklist.day_of_week = v.day_of_week
);

-- User settings for auto-archive
CREATE TABLE IF NOT EXISTS user_settings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name                 TEXT UNIQUE DEFAULT 'lola',
  email_auto_archive_noise  BOOLEAN DEFAULT FALSE,
  email_auto_archive_subs   BOOLEAN DEFAULT FALSE,
  email_auto_archive_junk   BOOLEAN DEFAULT TRUE,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO user_settings (user_name) VALUES ('lola') ON CONFLICT (user_name) DO NOTHING;
