-- Dispatch 114 — General pet care logging for Spike, Hades, Midnight
CREATE TABLE IF NOT EXISTS pet_care_log (
  id SERIAL PRIMARY KEY,
  pet_name TEXT NOT NULL,
  kid_name TEXT NOT NULL,
  task TEXT NOT NULL,
  care_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pet_name, kid_name, task, care_date)
);

CREATE INDEX IF NOT EXISTS idx_pet_care_log_date ON pet_care_log(care_date);
