-- Kid Health Requests table
-- Lets kids tell parents when something is bothering them
CREATE TABLE IF NOT EXISTS kid_health_requests (
  id SERIAL PRIMARY KEY,
  child_name TEXT NOT NULL,
  category TEXT NOT NULL,
  duration TEXT NOT NULL,
  severity TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  parent_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_kid_health_requests_child ON kid_health_requests(child_name);
CREATE INDEX IF NOT EXISTS idx_kid_health_requests_status ON kid_health_requests(status);
