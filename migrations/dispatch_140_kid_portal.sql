-- ============================================================================
-- Dispatch 140 — Kid Portal Log Consolidation + Enrichment
-- ============================================================================

-- Extend kid_activity_log as the canonical log table
ALTER TABLE kid_activity_log
  ADD COLUMN IF NOT EXISTS activity_source TEXT,
  ADD COLUMN IF NOT EXISTS source_id UUID,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_kal_kid_source ON kid_activity_log(kid_name, activity_source);
CREATE INDEX IF NOT EXISTS idx_kal_recorded ON kid_activity_log(recorded_at DESC);

-- Drop empty parallel tables (both confirmed 0 rows)
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS kid_enrichment_log;
