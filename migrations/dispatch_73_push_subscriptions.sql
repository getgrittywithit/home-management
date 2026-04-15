-- ============================================================================
-- Dispatch 73 PUSH-1 — Web Push Notifications
-- Per-device subscriptions for parent + kid portals. Backing storage for
-- web-push sendNotification() calls from src/lib/push.ts.
-- ============================================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            SERIAL PRIMARY KEY,
  target_role   TEXT NOT NULL CHECK (target_role IN ('parent', 'kid')),
  kid_name      TEXT,                   -- null for parent subscriptions
  endpoint      TEXT NOT NULL UNIQUE,   -- push service endpoint URL
  p256dh        TEXT NOT NULL,
  auth          TEXT NOT NULL,
  device_label  TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_used_at  TIMESTAMPTZ DEFAULT NOW(),
  failed_count  INTEGER DEFAULT 0       -- increment on push delivery failure, purge at threshold
);

CREATE INDEX IF NOT EXISTS idx_push_subs_role ON push_subscriptions(target_role);
CREATE INDEX IF NOT EXISTS idx_push_subs_kid ON push_subscriptions(kid_name) WHERE kid_name IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Daily rate limit counter for kid notifications (max 4/day per dispatch)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_rate_limit (
  kid_name    TEXT NOT NULL,
  date        DATE NOT NULL,
  sent_count  INTEGER DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (kid_name, date)
);
