-- ============================================================================
-- Dispatch 82 — Email triage + action item extraction
-- Extends email_inbox with account provenance, snooze, and task-conversion
-- tracking. email_triage_results already has action_details (JSONB) and
-- calendar_suggestion (JSONB) so the AI output fits without schema changes.
-- Single-family app, no family_id column.
-- ============================================================================

ALTER TABLE email_inbox
  ADD COLUMN IF NOT EXISTS account_email    TEXT,
  ADD COLUMN IF NOT EXISTS snoozed_until    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS task_created_id  INTEGER REFERENCES action_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at      TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_email_inbox_account   ON email_inbox(account_email);
CREATE INDEX IF NOT EXISTS idx_email_inbox_snoozed   ON email_inbox(snoozed_until);
CREATE INDEX IF NOT EXISTS idx_email_inbox_archived  ON email_inbox(archived_at);

-- Backfill existing rows with Lola's primary
UPDATE email_inbox
   SET account_email = 'mosesfamily2008@gmail.com'
 WHERE account_email IS NULL;
