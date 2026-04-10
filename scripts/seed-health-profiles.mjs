#!/usr/bin/env node
// Seed health profiles for all 6 kids — run once after deploy
// Usage: node scripts/seed-health-profiles.mjs [BASE_URL]
// Default: https://family-ops.grittysystems.com

const BASE = process.argv[2] || 'https://family-ops.grittysystems.com'

async function api(action, data) {
  const res = await fetch(`${BASE}/api/health`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...data }),
  })
  const json = await res.json()
  if (!res.ok) console.error(`  ❌ ${action} failed:`, json)
  else console.log(`  ✅ ${action}: ${data.family_member_name || data.medication_name || ''}`)
  return json
}

async function seedProfile(profile) {
  console.log(`\n🏥 ${profile.family_member_name}`)
  await api('add_health_profile', profile)
}

async function seedMed(med) {
  await api('add_medication', { member_group: 'kids', ...med })
}

async function run() {
  console.log(`Seeding health profiles to ${BASE}...\n`)

  // ═══════════════════════════════════════════════
  // AMOS LEE MOSES
  // ═══════════════════════════════════════════════
  await seedProfile({
    family_member_name: 'Amos',
    member_group: 'kids',
    chronic_conditions: [
      'ASD Level 1 / Mild Autism (dx Dec 2019, Joel Schirvar PsyD, Nystrom & Associates)',
      'ADHD Combined Type (F90.2)',
      'Specific Learning Disorder — Dyslexia (SLD with Impairment in Reading)',
      'Dyscalculia',
      'Speech Impairment (expressive; articulation — /l/ blends, /th/, /r/ blends)',
      'Auditory Processing Disorder (APD)',
      'Bilateral Hearing Loss (high-frequency)',
      'Color Vision Deficiency (shifted hues)',
      'Social Anxiety',
    ].join('\n'),
    notes: [
      'Plans: Active IEP (SLD/Dyslexia + Speech). Foundation graduation plan.',
      'WISC-5 (Nystrom 2019): Working Memory 100 (50th %ile — STRENGTH), Processing Speed 77 (6th %ile — SIGNIFICANT WEAKNESS), FSIQ 86 (18th %ile — not representative due to processing speed drag)',
      'Supplements: Vitamin D, NDF Calm',
      'Does NOT wear glasses (per Lola, March 2026)',
      'Working at ~2nd grade level in math; focus on rebuilding foundation',
    ].join('\n'),
  })

  await seedMed({ family_member_name: 'Amos', medication_name: 'Focalin', frequency: 'Daily AM', purpose: 'ADHD', is_active: true })
  await seedMed({ family_member_name: 'Amos', medication_name: 'Clonidine', frequency: 'Daily PM', purpose: 'Sleep', is_active: true })

  // ═══════════════════════════════════════════════
  // ZOEY LYNN MOSES
  // ═══════════════════════════════════════════════
  await seedProfile({
    family_member_name: 'Zoey',
    member_group: 'kids',
    chronic_conditions: [
      'Emotional Disability (504 educational determination — substantially limits concentrating)',
      'Unspecified Mood Disorder (Clarity Child Guidance Center discharge, April 2024)',
      'Anxiety with sensory/auditory components (school bell triggers physical panic)',
      'Sensory processing concerns (overwhelmed by loud noises, distractions in class)',
      'Sensitivity to excessive touch (per Clarity discharge)',
      'Irregular menstrual cycle (N92.6) — lab work ordered Aug 2025',
    ].join('\n'),
    notes: [
      'Plans: Active 504 Plan. Eligibility 05/06/2025. Plan date 04/09/2026. Next review 04/09/2029.',
      'Psychiatric History: Clarity Child Guidance Center inpatient April 15–19, 2024 (SI with plan/intent, SIB). Stabilized at discharge.',
      'TCHATT psychiatric referral (Jan 2024, UT Health San Antonio). Contact: 210-450-6450.',
      'Physician: Jesse Alvarado APRN | Therapist: Sabrina Estrada LPC-A (Clarity)',
      '504 Accommodations: Extended time +1 day, frequent breaks, counselor access at request, noise-cancelling headphones/fidgets.',
      '504 Gap: Missing weekly scheduled counselor meeting (Clarity recommended proactive, 504 is reactive only).',
      'Warning Signs (Clarity): Self-harming, isolating, crying spells, changes in sleep/mood/appetite/concentration.',
      '3 of 4 teachers flagged ATTENDANCE as primary concern. Strong student when present — 82 Algebra, Honor Roll, JROTC.',
      'Physical (Aug 2025): 130.4 lbs, 63.39", BMI 22.81. Provider: Dr. Jennifer Eck.',
      'Pharmacy: Walgreens #05765 Boerne',
      'Supplements: Daily vitamins',
    ].join('\n'),
    pharmacy_name: 'Walgreens #05765 Boerne',
  })

  await seedMed({ family_member_name: 'Zoey', medication_name: 'Escitalopram (Lexapro)', dosage: '20mg', frequency: 'Daily', purpose: 'Depression/Anxiety', is_active: true, notes: 'At Clarity discharge April 2024. Managed via TCHATT — being increased as of March 2024.' })
  await seedMed({ family_member_name: 'Zoey', medication_name: 'Hydroxyzine HCl', dosage: '10mg', frequency: 'PRN', purpose: 'Anxiety/Sleep', is_active: true })
  await seedMed({ family_member_name: 'Zoey', medication_name: 'Quetiapine (Seroquel)', dosage: '25mg', frequency: 'Bedtime', purpose: 'Mood', is_active: true })

  // ═══════════════════════════════════════════════
  // KAYLEE LIBERTY MOSES
  // ═══════════════════════════════════════════════
  await seedProfile({
    family_member_name: 'Kaylee',
    member_group: 'kids',
    chronic_conditions: [
      'ADHD Combined (F90.2)',
      'MDD Recurrent Moderate (F33.1)',
      'Unspecified Trauma/Stressor-Related Disorder (F43.9)',
      'Prolonged Grief Disorder rule-out (F43.81)',
      'Intellectual Disability (school IEP classification — NOT Autism per Feb 2026 ARD)',
      'Speech delay (expressive language)',
      'Suspected dyslexia (parent assessment — NOT formally qualified by school)',
    ].join('\n'),
    notes: [
      'Plans: Active IEP — Primary: Intellectual Disability (06).',
      'TCHATT referral Dec 2023, 5th grade.',
      'Individual counseling Dec 2023–Feb 2024 (grief, anxiety — counselor Juarez).',
      'Psych eval completed 3/31/2026 at Stonebridge Behavioral Health (Angelica Torres MS LPC-A). PDF encrypted, password: km2026.',
      'Therapist: atorres@stonebridgealliance.com, 210-314-3476 ext 132. Supervised by Sean T. Munley LPC-Supervisor.',
    ].join('\n'),
  })

  // ═══════════════════════════════════════════════
  // ELLIE MAGNOLIA MOSES
  // ═══════════════════════════════════════════════
  await seedProfile({
    family_member_name: 'Ellie',
    member_group: 'kids',
    chronic_conditions: 'Possible ADHD (undiagnosed as of 2026)',
    notes: [
      'Plans: Active 504 Plan.',
      'Former Honors ELAR student.',
      'MAP Math Growth: 99th percentile (Winter 2025, Grade 5) — HIGH-POTENTIAL learner.',
      'Math Achievement: RIT 221, 65th percentile.',
      'Business-minded, funny, loves life.',
    ].join('\n'),
  })

  // ═══════════════════════════════════════════════
  // WYATT JAMES MOSES
  // ═══════════════════════════════════════════════
  await seedProfile({
    family_member_name: 'Wyatt',
    member_group: 'kids',
    chronic_conditions: [
      'ADHD Severe',
      'Color Vision Deficiency (shifted hues)',
      'Sleep issues',
      'Speech Impairment (/r/ sounds — vocalic /r/ at 67%, /r/ blends at 55% as of May 2024)',
      'Possible SLD/Dyslexia (Vanderbilt Aug 2025: Reading + Written Expression at Problematic level, Math Above Average)',
    ].join('\n'),
    notes: [
      'Plans: Active IEP — Speech only. Vanderbilt screener data suggests SLD evaluation may be warranted.',
      'Supplements: Vitamin D 10,000 IU, NDF Calm, Kidz Digest Enzymes, Probiotics, iMagT (magnesium + inositol), Omega 3s, B12 (per Kaitlin Colby diet recommendations 2022)',
      'Physical (Aug 2025): 72.6 lbs (64.68%), 54.72" (62.28%), BMI 17.05 (61.32%). Provider: Dr. Jennifer Eck.',
      'Next well-child check: August 21, 2026.',
      'Struggles with self-regulation.',
    ].join('\n'),
    primary_doctor: 'Dr. Jennifer Eck',
  })

  await seedMed({ family_member_name: 'Wyatt', medication_name: 'Focalin', frequency: 'Daily AM', purpose: 'ADHD', is_active: true })
  await seedMed({ family_member_name: 'Wyatt', medication_name: 'Clonidine', frequency: 'Daily PM', purpose: 'Sleep', is_active: true })

  // ═══════════════════════════════════════════════
  // HANNAH JOY MOSES
  // ═══════════════════════════════════════════════
  await seedProfile({
    family_member_name: 'Hannah',
    member_group: 'kids',
    chronic_conditions: [
      'Auditory Sensitivity (sensory — uses ear protectors for loud noises)',
      'Speech: /r/ sounds + grammar/pronouns in progress',
      'Stutters when overwhelmed or under pressure',
    ].join('\n'),
    notes: [
      'Plans: 504 Plan + Speech IEP.',
      'History of ear infections. Broke leg (ER visit + casting with surgery — within 3 years prior to Jan 2024).',
      'No medications.',
      'Speech/IEP Progress (Dec 2024): Sight words 95% MASTERED, Math 95% MASTERED, Grammar/pronouns 90%, /r/ sounds 75% word / 60% sentences, Text evidence 48%, Writing 65%.',
      'Loves plants, crafts, cooking/baking, Roblox/Minecraft.',
      'Building confidence in reading and math.',
    ].join('\n'),
  })

  console.log('\n✅ All health profiles seeded!\n')
  console.log('Run on live site:')
  console.log(`  node scripts/seed-health-profiles.mjs ${BASE}`)
}

run().catch(e => { console.error('Failed:', e); process.exit(1) })
