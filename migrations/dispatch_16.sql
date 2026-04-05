-- Dispatch 16: Cycle Tracker Expansion + Kid Grocery Requests
-- Date: April 5, 2026

-- ═══════════════════════════════════════════════════════════════
-- NEW TABLES
-- ═══════════════════════════════════════════════════════════════

-- Cycle product usage tracking
CREATE TABLE IF NOT EXISTS kid_cycle_products (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  log_date DATE NOT NULL,
  product_type TEXT NOT NULL,
  product_detail TEXT,
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cycle_products_kid ON kid_cycle_products(kid_name, log_date);

-- Cycle OTC medication tracking
CREATE TABLE IF NOT EXISTS kid_cycle_otc_meds (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  log_date DATE NOT NULL,
  medication TEXT NOT NULL,
  dosage TEXT,
  time_taken TEXT,
  helped BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cycle_otc_kid ON kid_cycle_otc_meds(kid_name, log_date);

-- Kid grocery requests
CREATE TABLE IF NOT EXISTS kid_grocery_requests (
  id SERIAL PRIMARY KEY,
  kid_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  quantity TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  parent_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grocery_requests_kid ON kid_grocery_requests(kid_name, status);
CREATE INDEX IF NOT EXISTS idx_grocery_requests_status ON kid_grocery_requests(status, created_at);

-- ═══════════════════════════════════════════════════════════════
-- SEED: Clear existing test data for Kaylee + Zoey cycle tables
-- ═══════════════════════════════════════════════════════════════

DELETE FROM kid_cycle_products WHERE kid_name IN ('kaylee', 'zoey');
DELETE FROM kid_cycle_otc_meds WHERE kid_name IN ('kaylee', 'zoey');
DELETE FROM kid_cycle_symptoms WHERE kid_name IN ('kaylee', 'zoey');
DELETE FROM kid_cycle_log WHERE kid_name IN ('kaylee', 'zoey');

-- ═══════════════════════════════════════════════════════════════
-- SEED: Kaylee cycle logs (irregular, age 13)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO kid_cycle_log (kid_name, event_type, event_date) VALUES
('kaylee', 'start', '2026-01-08'),
('kaylee', 'end',   '2026-01-13'),
('kaylee', 'start', '2026-02-12'),
('kaylee', 'end',   '2026-02-16'),
('kaylee', 'start', '2026-03-10'),
('kaylee', 'end',   '2026-03-16'),
('kaylee', 'start', '2026-04-03'),
('kaylee', 'end',   '2026-04-07');

-- Kaylee symptoms
INSERT INTO kid_cycle_symptoms (kid_name, log_date, mood, cramps, flow, notes, irregularities)
VALUES
('kaylee', '2026-01-08', 'tired',  2, 'medium', 'First day, felt achy', '{}'),
('kaylee', '2026-01-09', 'okay',   1, 'heavy',  'Heaviest day', '{}'),
('kaylee', '2026-01-10', 'cranky', 2, 'medium', 'Cramps after lunch', '{}'),
('kaylee', '2026-01-11', 'okay',   1, 'light',  'Getting better', '{}'),
('kaylee', '2026-01-13', 'good',   0, 'light',  'Last day', '{}'),
('kaylee', '2026-02-12', 'tired',  2, 'medium', 'Started at school', '{late_period}'),
('kaylee', '2026-02-13', 'sad',    3, 'heavy',  'Bad cramps, stayed home', '{}'),
('kaylee', '2026-02-14', 'okay',   2, 'medium', 'Cramps eased up', '{}'),
('kaylee', '2026-02-15', 'good',   1, 'light',  'Feeling better', '{}'),
('kaylee', '2026-03-10', 'cranky', 1, 'light',  'Spotting started', '{}'),
('kaylee', '2026-03-11', 'tired',  2, 'medium', 'Picked up overnight', '{}'),
('kaylee', '2026-03-12', 'sad',    3, 'heavy',  'Worst day, headache too', '{heavy_flow}'),
('kaylee', '2026-03-13', 'okay',   2, 'medium', 'Tapering', '{}'),
('kaylee', '2026-03-14', 'okay',   1, 'light',  'Almost done', '{}'),
('kaylee', '2026-03-16', 'good',   0, 'light',  'Last day', '{}'),
('kaylee', '2026-04-03', 'tired',  2, 'medium', 'Early this month', '{early_period}'),
('kaylee', '2026-04-04', 'cranky', 2, 'heavy',  'Heavy second day', '{}'),
('kaylee', '2026-04-05', 'okay',   1, 'medium', 'Cramps mild today', '{}')
ON CONFLICT (kid_name, log_date) DO UPDATE SET
  mood = EXCLUDED.mood, cramps = EXCLUDED.cramps, flow = EXCLUDED.flow,
  notes = EXCLUDED.notes, irregularities = EXCLUDED.irregularities;

-- Kaylee products
INSERT INTO kid_cycle_products (kid_name, log_date, product_type, quantity, notes) VALUES
('kaylee', '2026-01-08', 'pad_regular',  3, NULL),
('kaylee', '2026-01-09', 'pad_regular',  4, 'Heavy day'),
('kaylee', '2026-01-09', 'heating_pad',  1, 'Used after school'),
('kaylee', '2026-01-10', 'pad_regular',  3, NULL),
('kaylee', '2026-01-11', 'pad_thin',     2, NULL),
('kaylee', '2026-01-13', 'liner',        1, 'Last day'),
('kaylee', '2026-02-12', 'pad_regular',  3, NULL),
('kaylee', '2026-02-13', 'pad_overnight',2, 'Bad cramps day'),
('kaylee', '2026-02-13', 'heating_pad',  1, NULL),
('kaylee', '2026-02-13', 'epsom_bath',   1, 'Helped with cramps'),
('kaylee', '2026-02-14', 'pad_regular',  3, NULL),
('kaylee', '2026-02-15', 'pad_thin',     2, NULL),
('kaylee', '2026-03-10', 'liner',        1, 'Spotting'),
('kaylee', '2026-03-11', 'pad_regular',  3, NULL),
('kaylee', '2026-03-12', 'pad_overnight',2, 'Heavy day'),
('kaylee', '2026-03-12', 'heating_pad',  1, NULL),
('kaylee', '2026-03-12', 'epsom_bath',   1, NULL),
('kaylee', '2026-03-13', 'pad_regular',  3, NULL),
('kaylee', '2026-03-14', 'pad_thin',     2, NULL),
('kaylee', '2026-04-03', 'pad_regular',  3, NULL),
('kaylee', '2026-04-04', 'pad_regular',  4, NULL),
('kaylee', '2026-04-04', 'heating_pad',  1, NULL),
('kaylee', '2026-04-05', 'pad_regular',  2, NULL);

-- Kaylee OTC meds
INSERT INTO kid_cycle_otc_meds (kid_name, log_date, medication, dosage, time_taken, helped, notes) VALUES
('kaylee', '2026-01-09', 'ibuprofen', '200mg',    'morning',   TRUE,  'Helped with cramps'),
('kaylee', '2026-01-10', 'ibuprofen', '200mg',    'afternoon', TRUE,  NULL),
('kaylee', '2026-02-13', 'midol',     '1 tablet', 'morning',   TRUE,  'Stayed home, this helped'),
('kaylee', '2026-02-13', 'tylenol',   '500mg',    'evening',   FALSE, 'Cramps came back'),
('kaylee', '2026-03-12', 'ibuprofen', '200mg',    'morning',   TRUE,  NULL),
('kaylee', '2026-03-12', 'ibuprofen', '200mg',    'evening',   TRUE,  'Took second dose'),
('kaylee', '2026-04-03', 'ibuprofen', '200mg',    'morning',   TRUE,  NULL),
('kaylee', '2026-04-04', 'midol',     '1 tablet', 'afternoon', TRUE,  NULL);

-- ═══════════════════════════════════════════════════════════════
-- SEED: Zoey cycle logs (regular, age 15)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO kid_cycle_log (kid_name, event_type, event_date) VALUES
('zoey', 'start', '2026-01-15'),
('zoey', 'end',   '2026-01-19'),
('zoey', 'start', '2026-02-11'),
('zoey', 'end',   '2026-02-15'),
('zoey', 'start', '2026-03-11'),
('zoey', 'end',   '2026-03-14');

-- Zoey symptoms
INSERT INTO kid_cycle_symptoms (kid_name, log_date, mood, cramps, flow, notes, irregularities)
VALUES
('zoey', '2026-01-15', 'okay',  1, 'medium', 'Normal start', '{}'),
('zoey', '2026-01-16', 'tired', 1, 'heavy',  'Heavy day 2', '{}'),
('zoey', '2026-01-17', 'okay',  1, 'medium', '', '{}'),
('zoey', '2026-01-19', 'good',  0, 'light',  'Last day', '{}'),
('zoey', '2026-02-11', 'tired', 2, 'medium', 'Cramps morning', '{}'),
('zoey', '2026-02-12', 'okay',  1, 'heavy',  'Heavy but manageable', '{}'),
('zoey', '2026-02-13', 'okay',  1, 'medium', '', '{}'),
('zoey', '2026-02-15', 'good',  0, 'light',  'Done', '{}'),
('zoey', '2026-03-11', 'okay',  1, 'medium', 'Right on time', '{}'),
('zoey', '2026-03-12', 'tired', 2, 'heavy',  'Cramps + tired', '{}'),
('zoey', '2026-03-13', 'okay',  1, 'medium', 'Better today', '{}'),
('zoey', '2026-03-14', 'good',  0, 'light',  'Short one this month', '{}')
ON CONFLICT (kid_name, log_date) DO UPDATE SET
  mood = EXCLUDED.mood, cramps = EXCLUDED.cramps, flow = EXCLUDED.flow,
  notes = EXCLUDED.notes, irregularities = EXCLUDED.irregularities;

-- Zoey products
INSERT INTO kid_cycle_products (kid_name, log_date, product_type, quantity, notes) VALUES
('zoey', '2026-01-15', 'pad_regular', 2, NULL),
('zoey', '2026-01-16', 'pad_regular', 3, NULL),
('zoey', '2026-01-17', 'pad_thin',    2, NULL),
('zoey', '2026-02-11', 'pad_regular', 2, NULL),
('zoey', '2026-02-12', 'pad_regular', 3, NULL),
('zoey', '2026-02-13', 'pad_thin',    2, NULL),
('zoey', '2026-03-11', 'pad_regular', 2, NULL),
('zoey', '2026-03-12', 'pad_regular', 3, NULL),
('zoey', '2026-03-13', 'pad_thin',    2, NULL);

-- ═══════════════════════════════════════════════════════════════
-- SEED: Update cycle settings for Kaylee + Zoey
-- ═══════════════════════════════════════════════════════════════

UPDATE kid_cycle_settings SET
  onboarded = TRUE,
  avg_cycle_length = 28,
  avg_period_duration = 6,
  cycle_regularity = 'irregular',
  common_symptoms = ARRAY['cramps', 'fatigue', 'mood_swings', 'headache'],
  updated_at = NOW()
WHERE kid_name = 'kaylee';

UPDATE kid_cycle_settings SET
  onboarded = TRUE,
  avg_cycle_length = 28,
  avg_period_duration = 5,
  cycle_regularity = 'regular',
  common_symptoms = ARRAY['cramps', 'fatigue'],
  updated_at = NOW()
WHERE kid_name = 'zoey';
