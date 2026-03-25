-- Onboarding + irregular logging columns
ALTER TABLE kid_cycle_settings
  ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS avg_cycle_length INTEGER DEFAULT 28,
  ADD COLUMN IF NOT EXISTS avg_period_duration INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS cycle_regularity TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS common_symptoms TEXT[] DEFAULT '{}';

-- Add irregularities array to symptoms
ALTER TABLE kid_cycle_symptoms
  ADD COLUMN IF NOT EXISTS irregularities TEXT[] DEFAULT '{}';
