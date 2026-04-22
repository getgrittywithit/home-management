-- Dispatch 140 — Book Vocabulary + Prompts AI Pipeline

CREATE TABLE IF NOT EXISTS book_extraction_log (
  id SERIAL PRIMARY KEY,
  book_id INTEGER,
  extraction_type TEXT NOT NULL,
  raw_llm_response JSONB,
  parsed_count INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_book_extraction_log_book ON book_extraction_log(book_id);
