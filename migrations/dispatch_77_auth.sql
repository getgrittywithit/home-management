-- ============================================================================
-- Dispatch 77 — AUTH Stage A
-- Local family auth (scrypt hashes, session cookies). Single-family app —
-- usernames link to the familyConfig kids, not a DB kids table.
-- ============================================================================

-- 1. Family accounts --------------------------------------------------------
CREATE TABLE IF NOT EXISTS family_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username        TEXT UNIQUE NOT NULL,                 -- 'mom', 'amos', etc.
  display_name    TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('parent','kid')),
  pin_hash        TEXT,                                 -- scrypt hash (kids)
  password_hash   TEXT,                                 -- scrypt hash (parents)
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_accounts_username ON family_accounts(username);
CREATE INDEX IF NOT EXISTS idx_family_accounts_role ON family_accounts(role);

-- 2. Credential log — AES-256 encrypted plaintext for parent recovery ------
CREATE TABLE IF NOT EXISTS credential_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          UUID NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  credential_type     TEXT NOT NULL CHECK (credential_type IN ('pin','password')),
  credential_ciphered TEXT NOT NULL,      -- base64 of iv|authTag|ciphertext
  set_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  set_by              UUID REFERENCES family_accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_credential_log_account ON credential_log(account_id, set_at DESC);

-- 3. Sessions ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS family_sessions (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  account_id  UUID NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_sessions_account ON family_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_family_sessions_expires ON family_sessions(expires_at);

-- 4. Seed the 8 family accounts (idempotent) -------------------------------
INSERT INTO family_accounts (username, display_name, role)
SELECT * FROM (VALUES
  ('mom',    'Mom (Lola)',   'parent'),
  ('dad',    'Dad (Levi)',   'parent'),
  ('amos',   'Amos',         'kid'),
  ('zoey',   'Zoey',         'kid'),
  ('kaylee', 'Kaylee',       'kid'),
  ('ellie',  'Ellie',        'kid'),
  ('wyatt',  'Wyatt',        'kid'),
  ('hannah', 'Hannah',       'kid')
) AS v(username, display_name, role)
WHERE NOT EXISTS (
  SELECT 1 FROM family_accounts WHERE family_accounts.username = v.username
);
