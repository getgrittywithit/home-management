#!/usr/bin/env node
// Seed advocacy & accommodation data for all 6 kids
// Usage: node scripts/seed-advocacy.mjs [BASE_URL]
const BASE = process.argv[2] || 'https://family-ops.grittysystems.com'

async function api(action, data) {
  const res = await fetch(`${BASE}/api/advocacy`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...data }),
  })
  const json = await res.json()
  if (!res.ok) console.error(`  ❌ ${action}:`, json.error)
  return json
}

async function run() {
  console.log(`Seeding advocacy data to ${BASE}...\n`)

  // ═══════════════════════════════════════
  // ZOEY — 504 Plan
  // ═══════════════════════════════════════
  console.log('📋 Zoey — 504 Plan')
  const zoeyPlan = await api('create_plan', {
    kid_name: 'zoey', plan_type: '504', status: 'active',
    qualifying_disability: 'Emotional Disability',
    major_life_activity: 'Concentrating',
    eligibility_date: '2025-05-06', plan_date: '2026-04-09', next_review_date: '2029-04-09',
    school_name: 'Champion High School',
    facilitator_name: 'Susan Collentine, Ed.D.',
    facilitator_email: 'Susan.Collentine@boerneisd.net',
    facilitator_phone: '830-357-2721',
  })
  const zpid = zoeyPlan.plan?.id

  // Accommodations
  for (const a of [
    { text: 'Extended time +1 day on homework, assignments, quizzes & tests', category: 'adapt_instruction', applies_to: 'all_core_electives' },
    { text: 'Frequent breaks at student request to redirect emotions (library, nurse, counselor)', category: 'manage_behavior', applies_to: 'all_core_electives' },
    { text: 'Access to counselor at student request', category: 'manage_behavior', applies_to: 'all_core_electives' },
    { text: 'Minimize auditory distractions — noise-cancelling headphones/earbuds, fidgets allowed', category: 'manage_behavior', applies_to: 'all_core_electives' },
  ]) {
    await api('add_accommodation', { plan_id: zpid, kid_name: 'zoey', accommodation_text: a.text, category: a.category, applies_to: a.applies_to, source: 'school_504' })
  }

  // Gaps
  await api('add_gap', { kid_name: 'zoey', gap_description: 'No weekly scheduled counselor meeting — 504 only has "at student request" (reactive)', clinical_source: 'Clarity Child Guidance Center discharge (April 2024)', clinical_source_date: '2024-04-19', recommendation: 'Request 504 amendment: add weekly scheduled counselor check-in (proactive, not reactive)', priority: 'critical' })
  await api('add_gap', { kid_name: 'zoey', gap_description: 'No makeup work assistance — 504 gives extended time but no help with completion', clinical_source: 'Clarity Child Guidance Center discharge (April 2024)', clinical_source_date: '2024-04-19', recommendation: 'Request 504 amendment: add assistance with assignment completion, not just extra time', priority: 'critical' })

  // Actions
  for (const a of [
    { text: 'Schedule follow-up with TCHATT for medication management review', type: 'clinical_followup', priority: 'high', contact_name: 'TCHATT', contact_phone: '210-450-6450', source: 'clarity_discharge' },
    { text: 'Verify 504 accommodation implementation with all 4 teachers', type: 'school_advocacy', priority: 'high', source: 'parent_identified' },
    { text: 'Request 504 amendment for weekly counselor meetings (proactive)', type: 'school_advocacy', priority: 'urgent', contact_name: 'Susan Collentine', contact_email: 'Susan.Collentine@boerneisd.net', source: 'clarity_discharge' },
    { text: 'Monitor attendance patterns — 3 of 4 teachers flagged attendance as primary concern', type: 'school_advocacy', priority: 'high', source: 'parent_identified' },
    { text: 'Follow up on irregular menstrual cycle lab work (TSH + Free T4)', type: 'clinical_followup', priority: 'medium', source: 'parent_identified' },
  ]) {
    await api('add_action', { kid_name: 'zoey', action_text: a.text, action_type: a.type, priority: a.priority, source: a.source, contact_name: a.contact_name || null, contact_email: a.contact_email || null, contact_phone: a.contact_phone || null })
  }

  // Documents
  await api('add_document', { kid_name: 'zoey', document_type: '504_plan', document_title: 'Section 504 Plan — Champion High School', document_date: '2026-04-09', provider_org: 'Boerne ISD', key_findings: '4 accommodations: extended time, breaks, counselor access, auditory tools. All core + electives.' })
  await api('add_document', { kid_name: 'zoey', document_type: 'discharge_summary', document_title: 'Clarity Child Guidance Center Discharge Summary', document_date: '2024-04-19', provider_name: 'Jesse Alvarado, APRN', provider_org: 'Clarity Child Guidance Center', key_findings: '4-day inpatient (SI with plan/intent, SIB). Dx: Unspecified Mood Disorder. Rx: Escitalopram 20mg, Hydroxyzine 10mg PRN, Quetiapine 25mg. Recommended: weekly counseling, makeup work assistance.' })
  await api('add_document', { kid_name: 'zoey', document_type: 'psych_eval', document_title: 'TCHATT Psychiatric Referral', document_date: '2024-01-15', provider_org: 'UT Health San Antonio', key_findings: 'Medication management referral. Being increased as of March 2024.' })

  // ═══════════════════════════════════════
  // KAYLEE — IEP
  // ═══════════════════════════════════════
  console.log('📋 Kaylee — IEP')
  const kayleePlan = await api('create_plan', {
    kid_name: 'kaylee', plan_type: 'iep', status: 'active',
    qualifying_disability: 'Intellectual Disability (06)',
    major_life_activity: 'Learning',
    school_name: 'BMSN',
    facilitator_name: 'Ashlie D\'Spain',
    facilitator_email: 'ashlie.dspain@boerneisd.net',
    notes: 'Feb 2026 ARD explicitly checked NO for Autism.',
  })

  // Gaps
  for (const g of [
    { desc: 'Parent concern re: amount of help in gen ed not documented in IEP', source: 'Feb 2026 ARD', rec: 'Request formal parent concern documentation in next ARD', priority: 'high' },
    { desc: 'Suspected dyslexia not formally evaluated by school', source: 'Parent assessment', rec: 'Request formal dyslexia screening per Texas Dyslexia Handbook', priority: 'high' },
    { desc: 'Assignment completion support insufficient', source: 'Parent observation', rec: 'Request additional gen ed support or aide time', priority: 'medium' },
    { desc: 'Writing at 23% — significantly below grade level', source: 'IEP progress data', rec: 'Request explicit writing intervention in IEP goals', priority: 'high' },
    { desc: 'Stonebridge psych eval completed 3/31/2026 — results not yet integrated into IEP', source: 'Stonebridge Behavioral Health', rec: 'Schedule ARD to review Stonebridge findings and update IEP accordingly', priority: 'urgent' },
  ]) {
    await api('add_gap', { kid_name: 'kaylee', gap_description: g.desc, clinical_source: g.source, recommendation: g.rec, priority: g.priority })
  }

  await api('add_document', { kid_name: 'kaylee', document_type: 'iep', document_title: 'IEP — BMSN (Intellectual Disability)', provider_org: 'Boerne ISD', key_findings: 'Primary: Intellectual Disability (06). 10 accommodations. Speech included.' })
  await api('add_document', { kid_name: 'kaylee', document_type: 'psych_eval', document_title: 'Stonebridge Behavioral Health Psych Eval', document_date: '2026-03-31', provider_name: 'Angelica Torres, MS, LPC-Associate', provider_org: 'Stonebridge Behavioral Health', key_findings: 'PDF encrypted, password: km2026. Free feedback session available.', is_encrypted: true })

  // ═══════════════════════════════════════
  // AMOS — Former IEP (homeschool)
  // ═══════════════════════════════════════
  console.log('📋 Amos — Former IEP')
  await api('create_plan', {
    kid_name: 'amos', plan_type: 'iep', status: 'inactive',
    qualifying_disability: 'SLD/Dyslexia + Speech',
    school_name: 'Homeschool (former public school)',
    notes: 'IEP was active until November 2025 (withdrawn for homeschool). Foundation graduation plan.',
  })

  for (const g of [
    { desc: 'No transition plan for post-secondary (required by 16 for IEP students)', source: 'IDEA requirements', rec: 'Create informal transition plan: vocational goals, independent living skills, Triton apprenticeship pathway', priority: 'medium' },
    { desc: 'Math at ~2nd grade level — needs systematic rebuild', source: 'Parent assessment + school records', rec: 'Implement Math Buddy placement quiz + structured skill rebuild in homeschool', priority: 'high' },
    { desc: 'Bilateral hearing loss not accommodated in homeschool setting', source: 'Nystrom eval (Dec 2019)', rec: 'Ensure face-to-face instruction, reduce background noise, check hearing aid/amplification options', priority: 'medium' },
    { desc: 'Color vision deficiency not documented in accommodations', source: 'Medical records', rec: 'Adjust digital materials for color-blind accessibility (avoid red/green only indicators)', priority: 'low' },
  ]) {
    await api('add_gap', { kid_name: 'amos', gap_description: g.desc, clinical_source: g.source, recommendation: g.rec, priority: g.priority })
  }

  await api('add_document', { kid_name: 'amos', document_type: 'psych_eval', document_title: 'Nystrom & Associates Neuropsych Evaluation', document_date: '2019-12-15', provider_name: 'Joel Schirvar, PsyD', provider_org: 'Nystrom & Associates', key_findings: 'ASD Level 1, ADHD Combined. WISC-5: WM 100 (50th), PS 77 (6th), FSIQ 86 (18th). Processing speed significant weakness.' })
  await api('add_document', { kid_name: 'amos', document_type: 'iep', document_title: 'School IEP (inactive — homeschool)', provider_org: 'Boerne ISD', key_findings: 'SLD/Dyslexia + Speech. Foundation graduation plan. Active until Nov 2025.' })

  // ═══════════════════════════════════════
  // ELLIE — 504
  // ═══════════════════════════════════════
  console.log('📋 Ellie — 504')
  await api('create_plan', {
    kid_name: 'ellie', plan_type: '504', status: 'active',
    school_name: 'Homeschool',
    notes: '504 plan details unknown — plan has not been scanned/uploaded yet.',
  })

  for (const g of [
    { desc: '504 plan not scanned or uploaded — accommodations unknown', source: 'Parent records', rec: 'Scan and upload 504 plan document', priority: 'high' },
    { desc: 'Possible ADHD not formally evaluated', source: 'Parent observation', rec: 'Consider ADHD evaluation if focus issues persist in homeschool', priority: 'medium' },
    { desc: 'High-potential learner (99th %ile math growth) may need enrichment challenge', source: 'MAP assessment Winter 2025', rec: 'Implement above-grade-level math challenges; monitor for boredom/disengagement', priority: 'medium' },
  ]) {
    await api('add_gap', { kid_name: 'ellie', gap_description: g.desc, clinical_source: g.source, recommendation: g.rec, priority: g.priority })
  }

  await api('add_document', { kid_name: 'ellie', document_type: '504_plan', document_title: '504 Plan (needs scan)', key_findings: 'Plan exists but has not been digitized. Details unknown.' })

  // ═══════════════════════════════════════
  // WYATT — Speech IEP
  // ═══════════════════════════════════════
  console.log('📋 Wyatt — Speech IEP')
  await api('create_plan', {
    kid_name: 'wyatt', plan_type: 'speech_iep', status: 'active',
    qualifying_disability: 'Speech Impairment',
    school_name: 'Homeschool (speech services through district)',
    notes: '/r/ sounds: vocalic /r/ at 67%, /r/ blends at 55% (May 2024).',
  })

  for (const g of [
    { desc: 'Possible SLD/Dyslexia — Vanderbilt Aug 2025 shows Reading + Written Expression at Problematic level while Math Above Average (same pattern as Amos)', source: 'Vanderbilt screener (Aug 2025)', rec: 'Request formal dyslexia evaluation through district or private provider', priority: 'high' },
    { desc: 'Speech services continuity during homeschool — verify district still providing', source: 'Parent concern', rec: 'Confirm speech therapy schedule with district; document any gaps in service', priority: 'medium' },
    { desc: 'Self-regulation difficulties not formally addressed in IEP', source: 'Parent observation', rec: 'Consider OT evaluation for self-regulation strategies; add sensory breaks to homeschool schedule', priority: 'medium' },
    { desc: 'Color vision deficiency not documented in accommodations', source: 'Medical records', rec: 'Adjust digital materials for color-blind accessibility', priority: 'low' },
  ]) {
    await api('add_gap', { kid_name: 'wyatt', gap_description: g.desc, clinical_source: g.source, recommendation: g.rec, priority: g.priority })
  }

  await api('add_document', { kid_name: 'wyatt', document_type: 'iep', document_title: 'Speech IEP', provider_org: 'Boerne ISD', key_findings: 'Speech only. /r/ sounds target. Vocalic /r/ 67%, /r/ blends 55% (May 2024).' })
  await api('add_document', { kid_name: 'wyatt', document_type: 'vanderbilt', document_title: 'Vanderbilt ADHD Screeners (Aug 2025)', document_date: '2025-08-15', provider_name: 'Dr. Jennifer Eck', key_findings: 'Reading + Written Expression at Problematic level. Math Above Average. Pattern consistent with SLD.' })
  await api('add_document', { kid_name: 'wyatt', document_type: 'progress_report', document_title: 'Kaitlin Colby Diet Recommendations (2022)', document_date: '2022-01-01', provider_name: 'Kaitlin Colby', key_findings: 'Vitamin D 10,000 IU, NDF Calm, Kidz Digest Enzymes, Probiotics, iMagT, Omega 3s, B12.' })

  // ═══════════════════════════════════════
  // HANNAH — 504 + Speech IEP
  // ═══════════════════════════════════════
  console.log('📋 Hannah — 504 + Speech IEP')
  await api('create_plan', { kid_name: 'hannah', plan_type: '504', status: 'active', school_name: 'Homeschool', notes: '504 plan not scanned — details unknown.' })
  await api('create_plan', { kid_name: 'hannah', plan_type: 'speech_iep', status: 'active', qualifying_disability: 'Speech Impairment', school_name: 'Homeschool', notes: '/r/ sounds + grammar/pronouns.' })

  for (const g of [
    { desc: '504 plan not scanned or uploaded — accommodations unknown', source: 'Parent records', rec: 'Scan and upload 504 plan document', priority: 'high' },
    { desc: 'Text comprehension at 48% — needs structured intervention', source: 'Speech IEP progress (Dec 2024)', rec: 'Implement text evidence comprehension activities; consider reading intervention program', priority: 'high' },
    { desc: 'Speech services continuity during homeschool', source: 'Parent concern', rec: 'Confirm speech therapy schedule with district', priority: 'medium' },
    { desc: 'Auditory sensitivity not formally documented as accommodation', source: 'Parent observation', rec: 'Document auditory sensitivity and ear protector use; add to 504 if returning to public school', priority: 'low' },
  ]) {
    await api('add_gap', { kid_name: 'hannah', gap_description: g.desc, clinical_source: g.source, recommendation: g.rec, priority: g.priority })
  }

  await api('add_document', { kid_name: 'hannah', document_type: '504_plan', document_title: '504 Plan (needs scan)', key_findings: 'Plan exists but has not been digitized.' })
  await api('add_document', { kid_name: 'hannah', document_type: 'progress_report', document_title: 'Speech IEP Progress Report (Dec 2024)', document_date: '2024-12-15', key_findings: 'Sight words 95% MASTERED, Math 95% MASTERED, Grammar/pronouns 90%, /r/ sounds 75% word / 60% sentences, Text evidence 48%, Writing 65%.' })

  console.log('\n✅ All advocacy data seeded!')
}

run().catch(e => { console.error('Failed:', e); process.exit(1) })
