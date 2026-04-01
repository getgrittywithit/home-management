-- Add assigned_to column to bonus_tasks for kid-specific task visibility
ALTER TABLE bonus_tasks ADD COLUMN IF NOT EXISTS assigned_to TEXT[] DEFAULT NULL;
