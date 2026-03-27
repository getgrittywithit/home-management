-- Parent Portal Fixes: announcement type/target, activity feed support
-- Created: 2026-03-27

-- Add type and target_kid columns to family_announcements
ALTER TABLE family_announcements ADD COLUMN IF NOT EXISTS announcement_type TEXT DEFAULT 'general';
ALTER TABLE family_announcements ADD COLUMN IF NOT EXISTS target_kid TEXT DEFAULT 'all';
