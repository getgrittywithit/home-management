-- Phase Q Migration: Business Revenue Log
-- Run this against your Supabase/PostgreSQL database

CREATE TABLE IF NOT EXISTS business_revenue_log (
  id SERIAL PRIMARY KEY,
  business TEXT NOT NULL CHECK (business IN ('triton', 'grit')),
  amount NUMERIC(10,2) NOT NULL,
  source TEXT,
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick recent lookups
CREATE INDEX IF NOT EXISTS idx_revenue_log_logged_at ON business_revenue_log (logged_at DESC);
