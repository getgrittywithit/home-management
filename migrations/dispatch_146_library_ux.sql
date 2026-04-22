-- Dispatch 146 — Library metadata backfill support + content warnings

-- Lookup metadata columns
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS description_short TEXT;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS isbn TEXT;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS total_pages INTEGER;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS lookup_source TEXT;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS lookup_at TIMESTAMPTZ;

-- Companion/enrichment columns
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS growth_themes TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS therapy_concepts TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS discussion_topics TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS companion_starter_questions TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS trigger_concepts TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS trigger_notes TEXT;
ALTER TABLE home_library ADD COLUMN IF NOT EXISTS academic_tags TEXT[] DEFAULT '{}'::TEXT[];

-- Kid reading preferences for content filtering
CREATE TABLE IF NOT EXISTS kid_reading_preferences (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL UNIQUE,
  warn_trigger_concepts TEXT[] DEFAULT '{}'::TEXT[],
  hide_trigger_concepts TEXT[] DEFAULT '{}'::TEXT[],
  parent_approved_book_ids INTEGER[] DEFAULT '{}'::INTEGER[],
  notify_parent_on_flagged_pick BOOLEAN DEFAULT TRUE,
  show_content_warnings_to_kid BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Zoey's safety preferences (per her history)
INSERT INTO kid_reading_preferences (kid_name, warn_trigger_concepts, notify_parent_on_flagged_pick)
VALUES ('zoey', ARRAY['self_harm_referenced', 'suicide_central_theme'], TRUE)
ON CONFLICT (kid_name) DO NOTHING;

-- Content warning acknowledgment log
CREATE TABLE IF NOT EXISTS kid_content_warning_acknowledgments (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  book_id INTEGER,
  shown_warnings JSONB,
  trigger_notes_snippet TEXT,
  kid_chose_to_proceed BOOLEAN NOT NULL,
  parent_notified BOOLEAN DEFAULT FALSE,
  parent_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_warning_acks_kid ON kid_content_warning_acknowledgments(kid_name);
