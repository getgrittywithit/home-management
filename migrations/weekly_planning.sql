-- ============================================================================
-- Migration: Weekly Planning Persistence
-- ============================================================================

CREATE TABLE IF NOT EXISTS parent_weekly_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_name TEXT NOT NULL DEFAULT 'Lola',
  category TEXT NOT NULL,
  task_label TEXT NOT NULL,
  day_of_week TEXT,
  week_start DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  is_recurring BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_checklist_week ON parent_weekly_checklist(parent_name, week_start);
