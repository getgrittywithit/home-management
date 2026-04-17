-- ============================================================================
-- Dispatch 101 — Lola's Digital Brain & Command Center
-- Quick captures, running notes, domain modes, weekly rhythm expansion.
-- ============================================================================

-- A-1: Quick Captures (brain dumps)
CREATE TABLE IF NOT EXISTS quick_captures (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_name   TEXT NOT NULL DEFAULT 'lola',
  raw_text      TEXT NOT NULL,
  domain        TEXT,
  kid_name      TEXT,
  priority      TEXT DEFAULT 'normal' CHECK (priority IN ('urgent','normal','low')),
  status        TEXT DEFAULT 'unsorted' CHECK (status IN ('unsorted','sorted','actioned','archived')),
  converted_to  TEXT,
  converted_ref UUID,
  tags          TEXT[] DEFAULT '{}',
  captured_at   TIMESTAMPTZ DEFAULT NOW(),
  sorted_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_captures_unsorted ON quick_captures(status, captured_at DESC) WHERE status = 'unsorted';

-- A-2: Running Notes per kid
CREATE TABLE IF NOT EXISTS kid_running_notes (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kid_name            TEXT NOT NULL,
  note_text           TEXT NOT NULL,
  category            TEXT DEFAULT 'observation' CHECK (category IN (
    'observation','concern','win','medical','behavior','school','accommodation','therapy','iep_504'
  )),
  tags                TEXT[] DEFAULT '{}',
  flagged_for_meeting BOOLEAN DEFAULT FALSE,
  source              TEXT DEFAULT 'manual',
  source_ref          UUID,
  noted_at            TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notes_kid ON kid_running_notes(kid_name, noted_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_flagged ON kid_running_notes(kid_name) WHERE flagged_for_meeting = TRUE;

-- A-3: Extend parent_weekly_checklist + parent_tasks
ALTER TABLE parent_weekly_checklist ADD COLUMN IF NOT EXISTS skipped BOOLEAN DEFAULT FALSE;
ALTER TABLE parent_weekly_checklist ADD COLUMN IF NOT EXISTS skipped_reason TEXT;
ALTER TABLE parent_weekly_checklist ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE parent_weekly_checklist ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE parent_weekly_checklist ADD COLUMN IF NOT EXISTS domain TEXT;
UPDATE parent_weekly_checklist SET domain = category WHERE domain IS NULL;

ALTER TABLE parent_tasks ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE parent_tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE parent_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE parent_tasks ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE parent_tasks ADD COLUMN IF NOT EXISTS source_ref UUID;
ALTER TABLE parent_tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE parent_tasks ADD COLUMN IF NOT EXISTS notes TEXT;

-- A-4: Domain mode config
CREATE TABLE IF NOT EXISTS domain_mode_config (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain       TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  icon         TEXT,
  color        TEXT,
  tab_sources  TEXT[] DEFAULT '{}',
  sort_order   INTEGER DEFAULT 0,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO domain_mode_config (domain, display_name, icon, color, sort_order) VALUES
  ('medical',   'Medical',   '🏥', '#ef4444', 1),
  ('school',    'School',    '🏫', '#3b82f6', 2),
  ('triton',    'Triton',    '🔧', '#f59e0b', 3),
  ('household', 'Household', '🏠', '#10b981', 4),
  ('finance',   'Finance',   '💰', '#8b5cf6', 5),
  ('homeschool','Homeschool','📚', '#06b6d4', 6),
  ('grocery',   'Grocery',   '🛒', '#f97316', 7),
  ('kids',      'Kids',      '👨‍👩‍👧‍👦', '#ec4899', 8)
ON CONFLICT (domain) DO NOTHING;

-- E-1: Expand weekly checklist
INSERT INTO parent_weekly_checklist (parent_name, category, task_label, day_of_week, week_start, is_recurring, domain)
SELECT v.parent_name, v.category, v.task_label, v.day_of_week, date_trunc('week', CURRENT_DATE)::date, TRUE, v.domain
FROM (VALUES
  ('lola','finance','Review Copilot transactions','monday','finance'),
  ('lola','finance','Check SNAP balance','monday','finance'),
  ('lola','medical','Check Amos + Wyatt med supply count','tuesday','medical'),
  ('lola','medical','Review kid mood trends this week','wednesday','medical'),
  ('lola','homeschool','Plan Friday subjects for HS kids','thursday','homeschool'),
  ('lola','homeschool','Review journey map progress','thursday','homeschool'),
  ('lola','grocery','Finalize grocery list from pantry gaps','friday','grocery'),
  ('lola','grocery','Check meal plan ingredients for next week','friday','grocery'),
  ('lola','kids','Weekly mood review — any patterns?','sunday','kids'),
  ('lola','kids','Check digi-pet status — any sad pets?','sunday','kids'),
  ('lola','kids','Review star balances — anyone saving up?','sunday','kids')
) AS v(parent_name, category, task_label, day_of_week, domain)
WHERE NOT EXISTS (
  SELECT 1 FROM parent_weekly_checklist pwc WHERE pwc.task_label = v.task_label AND pwc.day_of_week = v.day_of_week
);
