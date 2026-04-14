-- ============================================================================
-- Add interest_tag to elar_placement_passages so multiple audience-specific
-- passages can occupy the same (skill, level, passage_number) slot.
-- Triggered by batch 1b — Amos-specific 2nd-3rd passages conflict with
-- Hannah's 2nd-3rd passages on the same slots.
-- ============================================================================

ALTER TABLE elar_placement_passages
  ADD COLUMN IF NOT EXISTS interest_tag TEXT DEFAULT 'general';

-- Drop the old unique key (skill, level, passage_number) so we can allow
-- multiple rows per slot differentiated by audience.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'elar_placement_passages_skill_id_reading_level_passage_numb_key'
  ) THEN
    ALTER TABLE elar_placement_passages
      DROP CONSTRAINT elar_placement_passages_skill_id_reading_level_passage_numb_key;
  END IF;
END $$;

-- New unique key includes interest_tag.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'elar_placement_passages_slot_audience_unique'
  ) THEN
    ALTER TABLE elar_placement_passages
      ADD CONSTRAINT elar_placement_passages_slot_audience_unique
        UNIQUE (skill_id, reading_level, passage_number, interest_tag);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_elar_placement_interest
  ON elar_placement_passages(skill_id, reading_level, interest_tag);
