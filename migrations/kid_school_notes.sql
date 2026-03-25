CREATE TABLE IF NOT EXISTS kid_school_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('subject_idea', 'interest', 'supply_needed', 'ran_out_of')),
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ
);
