-- ============================================================================
-- Dispatch 104 — Finance System Activation
-- Seed Triton jobs from CLAUDE.md known clients.
-- ============================================================================

-- Seed known Triton jobs (linking to existing clients where possible)
INSERT INTO triton_jobs (client_name, job_description, status, source, notes, client_id)
SELECT v.client_name, v.job_description, v.status, v.source, v.notes,
  (SELECT id FROM triton_clients tc WHERE tc.name = v.client_name LIMIT 1)
FROM (VALUES
  ('Tiffany Muir',              'Ceiling fans & lights',                        'paid',      'referral', 'Invoiced & paid'),
  ('Steve & Alejandra Tunnell', 'Gym studio unit build + sauna plugs + gas fitting', 'paid', 'referral', 'Goes by Ale (AH-leh). Invoiced & paid.'),
  ('Victoria Nickel',           'Costco swing set build',                       'completed', NULL,       '29006 Bulls Pond, Fair Oaks TX 78015 (Front Gate). 2-day job Apr 2-3.'),
  ('Pedro Vazquez',             'Drywall cracks',                               'lead',      'google',   'Sent photos to Levi. Awaiting estimate.'),
  ('Fátima',                    'Estimate pending',                             'lead',      NULL,       'Awaiting estimate from Levi'),
  ('Annelise Osborn',           'LuAnn Gilmore job',                            'lead',      'referral', '(432) 556-6644. Awaiting her reply on timeframe.')
) AS v(client_name, job_description, status, source, notes)
WHERE NOT EXISTS (SELECT 1 FROM triton_jobs tj WHERE tj.client_name = v.client_name AND tj.job_description = v.job_description);
