// Dispatch 24 — Kaylee School Profile Data Seed
// Run: node scripts/run-dispatch-24.mjs

import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: (process.env.DATABASE_URL || 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:6543/postgres'),
  ssl: { rejectUnauthorized: false }
})

async function run() {
  const client = await pool.connect()
  try {
    console.log('=== Dispatch 24: Kaylee School Profile Data Seed ===\n')

    // ── 1. Create iep_goal_progress table (missing from Phase O) ──
    console.log('1. Creating iep_goal_progress table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS iep_goal_progress (
        id SERIAL PRIMARY KEY,
        kid_name TEXT NOT NULL,
        plan_id INTEGER,
        goal_text TEXT NOT NULL,
        goal_type TEXT DEFAULT 'official',
        source TEXT DEFAULT 'school',
        target_value REAL,
        current_value TEXT,
        measurement_type TEXT DEFAULT 'percentage',
        data_points JSONB DEFAULT '[]',
        status TEXT DEFAULT 'in_progress',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_iep_goals_kid ON iep_goal_progress(kid_name)`)
    console.log('   ✅ iep_goal_progress table created')

    // ── 2. Update existing IEP plan with real data ──
    console.log('\n2. Updating Kaylee IEP plan...')
    const existingPlan = await client.query(`SELECT id FROM kid_special_ed_plans WHERE kid_name = 'kaylee' AND plan_type = 'IEP' LIMIT 1`)
    let planId
    if (existingPlan.rows[0]) {
      planId = existingPlan.rows[0].id
      await client.query(`
        UPDATE kid_special_ed_plans SET
          status = 'active',
          start_date = '2026-03-06',
          review_date = '2027-02-26',
          next_meeting_date = NULL,
          next_meeting_time = NULL,
          next_meeting_location = 'BMSN',
          meeting_confirmed = false,
          accommodations = $1,
          goals = $2,
          notes = $3
        WHERE id = $4
      `, [
        JSON.stringify([
          'Content and Language Supports (Math, ELAR, Science, Social Studies)',
          'Copy of notes (All CORE subjects including electives)',
          'Oral accommodation: Text to Speech, or oral administration of assignments, classwork, tests, quizzes (All CORE including electives)',
          'Calculator, four function (Math, Science)',
          'Extended time: one extra class period to complete daily assignments, quizzes, projects, and tests (All CORE including electives)',
          'Blank graphic organizer for writing (ELAR)',
          'Spell checker, embedded software (ELAR)',
          'Small group administration, in a separate classroom at student request (All CORE including electives)',
          'Content modification: modified content in ELAR, Math, Science, Social Studies',
          'Modified workload or length of assignments/tests (All CORE including electives)',
        ]),
        JSON.stringify([
          { area: 'ELAR Reading', goal: 'Make logical inferences and support responses with relevant details from text, 70% accuracy, min 5 opportunities/grading period. (TEKS 110.22.b.5.F)', status: 'in_progress' },
          { area: 'ELAR Writing', goal: 'Edit and revise written work to improve grammar, mechanics, spelling, 60%→70% accuracy, min 5 opportunities/grading period. (TEKS 110.22.b.10.D.8). Also annual transition goal.', status: 'in_progress' },
          { area: 'Mathematics', goal: 'Identify key information in multi-step word problems and apply correct strategy (modeling, equation, estimation), 65% accuracy, min 5 opportunities/grading period. (TEKS 111.26.b.1.B)', status: 'in_progress' },
        ]),
        'Annual ARD 02/27/2026. Student ID: 504644. Grade 07, BMSN. Primary Disability: 06 - Intellectual Disability (NOT Autism — explicitly checked NO at ARD). Multiple Disabilities: No. Dyslexia/Dysgraphia: Does not qualify (per school). Assistive Technology: Yes. LRE: Mainstream (40) — 100% General Education. Services begin 03/06/2026. Transition planning initiated (Kaylee turns 14 during IEP year). FIE/REED: 3/7/2025. Lola not physically present at ARD (dental appt conflict for Zoey) — reviewed draft, gave written permission. All committee members: Agree.',
        planId,
      ])
      console.log(`   ✅ Updated existing plan (id: ${planId})`)
    } else {
      const result = await client.query(`
        INSERT INTO kid_special_ed_plans (kid_name, plan_type, status, start_date, review_date, next_meeting_location, accommodations, goals, notes)
        VALUES ('kaylee', 'IEP', 'active', '2026-03-06', '2027-02-26', 'BMSN', $1, $2, $3) RETURNING id
      `, [
        JSON.stringify([]),
        JSON.stringify([]),
        'Annual ARD 02/27/2026. See full notes.',
      ])
      planId = result.rows[0].id
      console.log(`   ✅ Created new plan (id: ${planId})`)
    }

    // ── 3. Fix meeting date (BUG-FIX-1) ──
    console.log('\n3. Fixing meeting date...')
    await client.query(`
      UPDATE kid_special_ed_meetings SET
        meeting_date = '2026-02-27',
        meeting_time = '14:30',
        meeting_type = 'annual_review',
        location = 'Boerne Middle School North (BMSN)',
        attendees = 'Troy Cooley (Administrator), Lola Moses (Parent — not physically present, reviewed draft, gave written permission), Heather Risner (SpEd Teacher), Samantha Songco-Twiss (GenEd Teacher), Emily Jackson (Assessment), Courtney Ludy (CTE Rep)',
        outcome = 'IEP renewed for 2026-2027. All Agree. Disability: Intellectual Disability (Autism: NO). LRE: Mainstream 100% GenEd. Speech: Does Not Receive. 3 goals (ELAR Reading 70%, ELAR Writing 60→70%, Math 65%). Transition planning initiated.',
        notes = 'Annual Review ARD. Lola not present (Zoey dental appt in SA). Reviewed draft via email, gave written permission. STAAR Spring 2025: Reading 1516 (DNM), Math 1572 (DNM). HB1416: 900 min RLA + 900 min Math completed.'
      WHERE kid_name = 'kaylee'
    `)
    // Also fix any NULL meeting_date records
    await client.query(`UPDATE kid_special_ed_meetings SET meeting_date = '2026-02-27' WHERE kid_name = 'kaylee' AND meeting_date IS NULL`)
    console.log('   ✅ Meeting date fixed')

    // ── 4. Seed contacts ──
    console.log('\n4. Seeding contacts...')
    // Clear old placeholder contacts
    await client.query(`DELETE FROM kid_special_contacts WHERE kid_name = 'kaylee'`)

    const contacts = [
      ['Heather Risner', 'ard_coordinator', 'ARD Case Manager / SpEd Dept Chair', 'Heather.Risner@boerneisd.net', '830-357-3155', null, 'BMSN SpEd Department Chair, Inclusion Social Studies, Case Manager. Primary IEP contact.'],
      ["Ashlie D'Spain", 'attendance_secretary', 'School Contact', 'ashlie.dspain@boerneisd.net', null, null, 'BMSN school contact'],
      ['Lori Flisowski', '504_facilitator', 'Shining Stars Director', 'lori.flisowski@boerneisd.net', '830-357-3152', null, 'BMSN Shining Stars program director'],
      ['Angelica Torres, MS, LPC-Associate, NCC', 'ard_coordinator', 'Therapist', 'atorres@stonebridgealliance.com', '210-314-3476', '132', 'Stonebridge Behavioral Health. Supervised by Sean T. Munley, LPC-Supervisor. Psych eval completed 3/31/2026.'],
      ['Elizabeth Flanagan, Psy.D.', 'ard_coordinator', 'Evaluating Psychologist', 'eflanagan@stonebridgealliance.com', '210-314-3476', null, 'Stonebridge Behavioral Health. Supervised by Ann Marie Hernandez, Ph.D. Full eval Feb 2, 2026.'],
      ['Samantha Songco-Twiss', 'ard_coordinator', 'General Education Teacher', null, null, null, 'BMSN GenEd Teacher. Attended 2/27/2026 ARD. Responsible for IEP goals alongside SpEd teacher.'],
      ['Annie Seiter', 'ard_coordinator', 'Special Education Administrator (District)', 'ann.seiter@boerneisd.net', '830-357-2098', null, 'Boerne ISD SpEd office. District-level contact for SHARS/Medicaid and special education services.'],
    ]

    for (const [name, role, roleLabel, email, phone, ext, notes] of contacts) {
      await client.query(
        `INSERT INTO kid_special_contacts (kid_name, contact_name, role, role_label, email, phone, phone_ext, notes)
         VALUES ('kaylee', $1, $2, $3, $4, $5, $6, $7)`,
        [name, role, roleLabel, email, phone, ext, notes]
      )
    }
    console.log(`   ✅ ${contacts.length} contacts seeded`)

    // ── 5. Seed documents ──
    console.log('\n5. Seeding documents...')
    const existingDocs = await client.query(`SELECT COUNT(*)::int as c FROM kid_school_documents WHERE kid_name = 'kaylee'`)
    if (existingDocs.rows[0].c === 0) {
      const docs = [
        ['IEP', 'Annual ARD — Feb 27, 2026 (73 pages)', '2025-2026', 'Complete Annual ARD packet. IEP renewed 2026-2027. Primary Disability: Intellectual Disability. 3 goals (ELAR Reading 70%, ELAR Writing 60→70%, Math 65%). 10 accommodations. LRE: Mainstream 100% GenEd. Speech: Does Not Receive. Transition planning initiated. Includes present levels, schedule of services, HB1416 supplement, transition goals, SPIN inventory, prior year progress, email correspondence, consent forms.'],
        ['Other', 'Stonebridge Psychological Evaluation — Full (25 pages)', '2025-2026', 'Comprehensive eval by Elizabeth Flanagan, Psy.D. (Feb 2, 2026). Dx: ADHD Combined (F90.2), MDD Recurrent Moderate (F33.1), Unspecified Trauma/Stressor-Related Disorder (F43.9). Rule-out: Prolonged Grief (F43.81). WASI-II FSIQ: 71 (3rd%, Borderline). WRAT-5: Reading SS 72 (3rd%, grade 2.6), Math SS 63 (1st%, grade 2.1). SRS-2 Total T=76 (Severe). ASRS Total T=61 (Slightly Elevated). Recommendations: share with school, trauma-informed therapy, monitor depression.'],
        ['Other', 'IEP Goal Progress Reports — 2024-2025 Cycle', '2024-2025', 'Quarterly progress for 3 prior-year IEP goals (all MASTERED). ELAR Reading (inference/evidence): 0→62, Mastered. ELAR Writing (focused paragraph): 20→60, Mastered. Math (problem-solving): 0→60, Mastered. 5 checkpoints: 03/07/2025 through 03/06/2026.'],
      ]
      for (const [docType, docName, year, summary] of docs) {
        await client.query(
          `INSERT INTO kid_school_documents (kid_name, doc_type, doc_name, academic_year, summary) VALUES ('kaylee', $1, $2, $3, $4)`,
          [docType, docName, year, summary]
        )
      }
      console.log(`   ✅ ${docs.length} documents seeded`)
    } else {
      console.log(`   ⏭️  Documents already exist (${existingDocs.rows[0].c})`)
    }

    // ── 6. Seed IEP goals (official + supplemental) ──
    console.log('\n6. Seeding IEP goals...')
    const existingGoals = await client.query(`SELECT COUNT(*)::int as c FROM iep_goal_progress WHERE kid_name = 'kaylee'`)
    if (existingGoals.rows[0].c === 0) {
      // 3 official school IEP goals
      const officialGoals = [
        ['ELAR Reading: Make logical inferences and support responses with relevant details from text, 70% accuracy in min 5 opportunities/grading period. (TEKS 110.22.b.5.F). Baseline: 62% accuracy. Prior year mastered at 62% (target 60%).', 70, 'percentage', 'official', 'school'],
        ['ELAR Writing: Edit and revise written work to improve grammar, mechanics, spelling, increasing accuracy from 60% to 70% in min 5 opportunities/grading period. (TEKS 110.22.b.10.D.8). Also annual transition goal. Baseline: 60%. Prior year mastered at 60% on ECR.', 70, 'percentage', 'official', 'school'],
        ['Math: Identify key information in multi-step word problems and apply correct strategy (modeling, equation, estimation) with 65% accuracy in min 5 opportunities/grading period. (TEKS 111.26.b.1.B). Baseline: 55%. Prior year mastered at 60% but struggles independently.', 65, 'percentage', 'official', 'school'],
      ]

      // 3 supplemental parent-identified goals
      const supplementalGoals = [
        ['Speech & Articulation (Home Focus): Continue speech practice at home despite school exiting Kaylee from services (ARD: "Does Not Receive"). Stonebridge eval noted speech/language history. Parent confirms speech needs not fully resolved. Focus on clarity, articulation, and expressive language.', null, 'observation', 'supplemental', 'parent'],
        ['Social/Emotional Skills (Home Focus): Build understanding of social context, cues, norms, and appropriate responses. Stonebridge eval: SRS-2 Total T=76 (Severe Range — significant social skill deficits). Dx includes MDD Recurrent Moderate and Trauma/Stressor-Related Disorder. Needs guidance with reading social situations and self-regulation.', null, 'observation', 'supplemental', 'parent'],
        ['Executive Functioning (Home Focus): Build skills in task initiation, planning, time management, assignment completion, organization. ARD present levels: "Does not complete/turn in assignments on time." Stonebridge eval: ADHD Combined (F90.2). ASRS Total T=61. Parent confirms significant challenges with follow-through and multi-step task management.', null, 'observation', 'supplemental', 'parent'],
      ]

      for (const [text, target, mtype, gtype, src] of [...officialGoals, ...supplementalGoals]) {
        await client.query(
          `INSERT INTO iep_goal_progress (kid_name, plan_id, goal_text, target_value, measurement_type, goal_type, source)
           VALUES ('kaylee', $1, $2, $3, $4, $5, $6)`,
          [planId, text, target, mtype, gtype, src]
        )
      }
      console.log(`   ✅ ${officialGoals.length} official + ${supplementalGoals.length} supplemental goals seeded`)
    } else {
      console.log(`   ⏭️  Goals already exist (${existingGoals.rows[0].c})`)
    }

    console.log('\n=== Dispatch 24 complete! ===')
    console.log('Kaylee school profile fully populated:')
    console.log('  - IEP plan updated with 10 accommodations, 3 goals, full notes')
    console.log('  - Meeting date fixed (no more Invalid Date)')
    console.log('  - 7 contacts (Risner, D\'Spain, Flisowski, Torres, Flanagan, Songco-Twiss, Seiter)')
    console.log('  - 3 documents (Annual ARD, Psych Eval, Prior Year Progress)')
    console.log('  - 6 IEP goals (3 official + 3 supplemental Home Focus)')

  } catch (err) {
    console.error('Migration error:', err)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
