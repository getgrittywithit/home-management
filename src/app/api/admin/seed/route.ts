import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// Browser-runnable seed endpoint
// Usage: /api/admin/seed?target=health_profiles
//        /api/admin/seed?target=advocacy
//        /api/admin/seed?target=all

const HEALTH_PROFILES = [
  {
    family_member_name: 'Amos', member_group: 'kids',
    chronic_conditions: 'ASD Level 1 / Mild Autism (dx Dec 2019, Joel Schirvar PsyD, Nystrom & Associates)\nADHD Combined Type (F90.2)\nSpecific Learning Disorder — Dyslexia (SLD with Impairment in Reading)\nDyscalculia\nSpeech Impairment (expressive; articulation — /l/ blends, /th/, /r/ blends)\nAuditory Processing Disorder (APD)\nBilateral Hearing Loss (high-frequency)\nColor Vision Deficiency (shifted hues)\nSocial Anxiety',
    notes: 'Plans: Active IEP (SLD/Dyslexia + Speech). Foundation graduation plan.\nWISC-5 (Nystrom 2019): Working Memory 100 (50th %ile — STRENGTH), Processing Speed 77 (6th %ile — SIGNIFICANT WEAKNESS), FSIQ 86 (18th %ile)\nSupplements: Vitamin D, NDF Calm\nDoes NOT wear glasses (per Lola, March 2026)\nWorking at ~2nd grade level in math; focus on rebuilding foundation',
  },
  {
    family_member_name: 'Zoey', member_group: 'kids',
    chronic_conditions: 'Emotional Disability (504 educational determination — substantially limits concentrating)\nUnspecified Mood Disorder (Clarity Child Guidance Center discharge, April 2024)\nAnxiety with sensory/auditory components (school bell triggers physical panic)\nSensory processing concerns (overwhelmed by loud noises, distractions in class)\nSensitivity to excessive touch (per Clarity discharge)\nIrregular menstrual cycle (N92.6) — lab work ordered Aug 2025',
    notes: 'Plans: Active 504 Plan. Eligibility 05/06/2025. Plan date 04/09/2026. Next review 04/09/2029.\nClarity Child Guidance Center inpatient April 15–19, 2024 (SI with plan/intent, SIB).\nTCHATT psychiatric referral (Jan 2024). Contact: 210-450-6450.\n504 Accommodations: Extended time +1 day, frequent breaks, counselor access, noise-cancelling headphones/fidgets.\n504 Gap: Missing weekly scheduled counselor meeting.\nWarning Signs (Clarity): Self-harming, isolating, crying spells, changes in sleep/mood/appetite/concentration.\nPhysical (Aug 2025): 130.4 lbs, 63.39", BMI 22.81. Provider: Dr. Jennifer Eck.\nSupplements: Daily vitamins',
    pharmacy_name: 'Walgreens #05765 Boerne',
  },
  {
    family_member_name: 'Kaylee', member_group: 'kids',
    chronic_conditions: 'ADHD Combined (F90.2)\nMDD Recurrent Moderate (F33.1)\nUnspecified Trauma/Stressor-Related Disorder (F43.9)\nProlonged Grief Disorder rule-out (F43.81)\nIntellectual Disability (school IEP classification — NOT Autism per Feb 2026 ARD)\nSpeech delay (expressive language)\nSuspected dyslexia (parent assessment — NOT formally qualified by school)',
    notes: 'Plans: Active IEP — Primary: Intellectual Disability (06).\nTCHATT referral Dec 2023, 5th grade.\nIndividual counseling Dec 2023–Feb 2024 (grief, anxiety — counselor Juarez).\nPsych eval completed 3/31/2026 at Stonebridge (Angelica Torres MS LPC-A). PDF encrypted, password: km2026.',
  },
  {
    family_member_name: 'Ellie', member_group: 'kids',
    chronic_conditions: 'Possible ADHD (undiagnosed as of 2026)',
    notes: 'Plans: Active 504 Plan.\nFormer Honors ELAR student.\nMAP Math Growth: 99th percentile (Winter 2025, Grade 5) — HIGH-POTENTIAL learner.\nMath Achievement: RIT 221, 65th percentile.',
  },
  {
    family_member_name: 'Wyatt', member_group: 'kids',
    chronic_conditions: 'ADHD Severe\nColor Vision Deficiency (shifted hues)\nSleep issues\nSpeech Impairment (/r/ sounds — vocalic /r/ at 67%, /r/ blends at 55% as of May 2024)\nPossible SLD/Dyslexia (Vanderbilt Aug 2025: Reading + Written Expression at Problematic level, Math Above Average)',
    notes: 'Plans: Active IEP — Speech only. Vanderbilt screener suggests SLD evaluation warranted.\nSupplements: Vitamin D 10,000 IU, NDF Calm, Kidz Digest Enzymes, Probiotics, iMagT, Omega 3s, B12\nPhysical (Aug 2025): 72.6 lbs, 54.72", BMI 17.05. Provider: Dr. Jennifer Eck.\nNext well-child check: August 21, 2026.',
    primary_doctor: 'Dr. Jennifer Eck',
  },
  {
    family_member_name: 'Hannah', member_group: 'kids',
    chronic_conditions: 'Auditory Sensitivity (sensory — uses ear protectors for loud noises)\nSpeech: /r/ sounds + grammar/pronouns in progress\nStutters when overwhelmed or under pressure',
    notes: 'Plans: 504 Plan + Speech IEP.\nHistory of ear infections. Broke leg (ER visit + casting with surgery).\nNo medications.\nSpeech/IEP Progress (Dec 2024): Sight words 95% MASTERED, Math 95% MASTERED, Grammar/pronouns 90%, /r/ sounds 75% word / 60% sentences, Text evidence 48%, Writing 65%.',
  },
]

const MEDICATIONS = [
  { family_member_name: 'Amos', member_group: 'kids', medication_name: 'Focalin', frequency: 'Daily AM', purpose: 'ADHD', is_active: true },
  { family_member_name: 'Amos', member_group: 'kids', medication_name: 'Clonidine', frequency: 'Daily PM', purpose: 'Sleep', is_active: true },
  { family_member_name: 'Zoey', member_group: 'kids', medication_name: 'Escitalopram (Lexapro)', dosage: '20mg', frequency: 'Daily', purpose: 'Depression/Anxiety', is_active: true },
  { family_member_name: 'Zoey', member_group: 'kids', medication_name: 'Hydroxyzine HCl', dosage: '10mg', frequency: 'PRN', purpose: 'Anxiety/Sleep', is_active: true },
  { family_member_name: 'Zoey', member_group: 'kids', medication_name: 'Quetiapine (Seroquel)', dosage: '25mg', frequency: 'Bedtime', purpose: 'Mood', is_active: true },
  { family_member_name: 'Wyatt', member_group: 'kids', medication_name: 'Focalin', frequency: 'Daily AM', purpose: 'ADHD', is_active: true },
  { family_member_name: 'Wyatt', member_group: 'kids', medication_name: 'Clonidine', frequency: 'Daily PM', purpose: 'Sleep', is_active: true },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const target = searchParams.get('target') || ''

  const results: string[] = []

  try {
    if (target === 'health_profiles' || target === 'all') {
      // Ensure tables exist
      await db.query(`CREATE TABLE IF NOT EXISTS health_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), family_member_name TEXT, member_group TEXT,
        insurance_plan_id UUID, primary_doctor TEXT, primary_doctor_phone TEXT, primary_doctor_address TEXT,
        pharmacy_name TEXT, pharmacy_phone TEXT, pharmacy_address TEXT, blood_type TEXT, allergies TEXT,
        chronic_conditions TEXT, emergency_contact TEXT, emergency_phone TEXT, notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
      )`).catch(() => {})

      for (const p of HEALTH_PROFILES) {
        // Check if already exists
        const existing = await db.query(`SELECT id FROM health_profiles WHERE family_member_name = $1 AND member_group = $2`, [p.family_member_name, p.member_group]).catch(() => [])
        if (existing.length > 0) {
          await db.query(`UPDATE health_profiles SET chronic_conditions = $1, notes = $2, pharmacy_name = COALESCE($3, pharmacy_name), primary_doctor = COALESCE($4, primary_doctor), updated_at = NOW() WHERE family_member_name = $5 AND member_group = $6`,
            [p.chronic_conditions, p.notes, (p as any).pharmacy_name || null, (p as any).primary_doctor || null, p.family_member_name, p.member_group])
          results.push(`Updated: ${p.family_member_name}`)
        } else {
          await db.query(`INSERT INTO health_profiles (family_member_name, member_group, chronic_conditions, notes, pharmacy_name, primary_doctor) VALUES ($1, $2, $3, $4, $5, $6)`,
            [p.family_member_name, p.member_group, p.chronic_conditions, p.notes, (p as any).pharmacy_name || null, (p as any).primary_doctor || null])
          results.push(`Created: ${p.family_member_name}`)
        }
      }

      // Ensure medications table exists
      await db.query(`CREATE TABLE IF NOT EXISTS medications (
        id SERIAL PRIMARY KEY, family_member_name TEXT, member_group TEXT, medication_name TEXT,
        dosage TEXT, frequency TEXT, prescribing_doctor TEXT, pharmacy TEXT, start_date DATE, end_date DATE,
        refill_date DATE, refills_remaining INTEGER, purpose TEXT, side_effects TEXT, is_active BOOLEAN DEFAULT true, notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`).catch(() => {})

      for (const m of MEDICATIONS) {
        const existing = await db.query(`SELECT id FROM medications WHERE family_member_name = $1 AND medication_name = $2`, [m.family_member_name, m.medication_name]).catch(() => [])
        if (existing.length === 0) {
          await db.query(`INSERT INTO medications (family_member_name, member_group, medication_name, dosage, frequency, purpose, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [m.family_member_name, m.member_group, m.medication_name, (m as any).dosage || null, m.frequency, m.purpose, m.is_active])
          results.push(`Med added: ${m.family_member_name} - ${m.medication_name}`)
        } else {
          results.push(`Med exists: ${m.family_member_name} - ${m.medication_name}`)
        }
      }
    }

    if (target === 'advocacy' || target === 'all') {
      // Trigger the advocacy tables to be created
      await fetch(new URL('/api/advocacy?action=list_plans', req.url).toString()).catch(() => {})
      results.push('Advocacy tables ensured. Run seed-advocacy.mjs for full data, or visit /api/advocacy?action=list_plans to verify.')
    }

    if (!target || (target !== 'health_profiles' && target !== 'advocacy' && target !== 'all')) {
      return NextResponse.json({
        usage: 'GET /api/admin/seed?target=health_profiles | advocacy | all',
        available: ['health_profiles', 'advocacy', 'all'],
      })
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
