CREATE TABLE IF NOT EXISTS kid_duty_log (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  duty TEXT NOT NULL,           -- 'dinner_manager' | 'laundry'
  task TEXT NOT NULL,
  duty_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT TRUE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (kid_name, duty, task, duty_date)
);

CREATE INDEX IF NOT EXISTS idx_duty_log ON kid_duty_log(kid_name, duty_date);
