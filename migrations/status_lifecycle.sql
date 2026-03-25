-- Messages: add resolved state and read_at timestamp
ALTER TABLE family_messages ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT FALSE;
ALTER TABLE family_messages ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE family_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- School Notes: add read tracking
ALTER TABLE kid_school_notes ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Backfill: mark existing read_by_parent=true messages as read
UPDATE family_messages SET read_at = NOW() WHERE read_by_parent = TRUE AND read_at IS NULL;
