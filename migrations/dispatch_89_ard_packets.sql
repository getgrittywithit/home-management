-- ============================================================================
-- Dispatch 89 — ARD/IEP Packet Export System
-- Stores compiled packets for school meetings.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ard_packets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name            TEXT NOT NULL,
  meeting_date        DATE,
  meeting_type        TEXT CHECK (meeting_type IN ('annual','review','amendment','initial','transition')),
  date_range_start    DATE NOT NULL,
  date_range_end      DATE NOT NULL,
  packet_data         JSONB NOT NULL,
  parent_notes        TEXT,
  concerns            TEXT[],
  requested_changes   TEXT[],
  pdf_url             TEXT,
  status              TEXT DEFAULT 'draft' CHECK (status IN ('draft','finalized','shared')),
  shared_with         TEXT[],
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ard_packets_kid ON ard_packets(kid_name);
