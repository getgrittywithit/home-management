-- ============================================================================
-- Dispatch 140 — Kid Portal Log Consolidation + Enrichment
-- ============================================================================
-- Existing kid_activity_log columns (confirmed via information_schema):
--   id integer, child_name text NOT NULL, activity_type text NOT NULL,
--   duration_minutes integer, notes text, log_date date NOT NULL, created_at timestamptz
-- We keep `child_name` and `log_date` (D115 will rename project-wide later).

-- Add polymorphism columns for activity_source + source_id + rating.
ALTER TABLE kid_activity_log
  ADD COLUMN IF NOT EXISTS activity_source TEXT,
  ADD COLUMN IF NOT EXISTS source_id UUID,
  ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating BETWEEN 1 AND 5);

-- Indexes aligned with real column names.
CREATE INDEX IF NOT EXISTS idx_kal_child_source ON kid_activity_log(child_name, activity_source);
CREATE INDEX IF NOT EXISTS idx_kal_log_date ON kid_activity_log(log_date DESC);

-- Drop the two empty parallel tables (confirmed 0 rows each).
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS kid_enrichment_log;
