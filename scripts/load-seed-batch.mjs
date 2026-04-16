#!/usr/bin/env node
// ============================================================================
// D79 SEED-2 — Generic JSON batch loader for the learning engine.
//
// Usage:
//   node scripts/load-seed-batch.mjs seed-data/batch-3-hannah.json
//   node scripts/load-seed-batch.mjs seed-data/batch-3-amos.json
//
// Input format — see the D79 dispatch for full schema. Top-level shape:
//   { batch: N, kid: "hannah", items: [ ... ] }
//
// ELAR items go into elar_placement_passages.
// Math items go into math_placement_problems.
// ============================================================================

import pg from 'pg'
import { readFileSync } from 'fs'

const { Pool } = pg
const pool = new Pool({
  connectionString: 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres',
})

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/load-seed-batch.mjs <path-to-json>')
  process.exit(1)
}

const raw = readFileSync(file, 'utf-8')
const data = JSON.parse(raw)
const { batch, kid, items } = data

if (!items || !Array.isArray(items)) {
  console.error('JSON must have { items: [...] }')
  process.exit(1)
}

console.log(`Loading batch ${batch || '?'} for ${kid || 'unknown'} — ${items.length} items`)

let inserted = 0
let skipped = 0
let errors = 0

for (const item of items) {
  try {
    if (item.subject === 'elar') {
      await pool.query(
        `INSERT INTO elar_placement_passages
           (skill_id, reading_level, difficulty, passage_number, passage_text, question,
            answer_key, scoring_rubric, age_appropriate_context, interest_tag,
            encouragement_correct, encouragement_wrong, hint_text, title, vocabulary)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (skill_id, reading_level, passage_number, interest_tag) DO UPDATE SET
           passage_text = EXCLUDED.passage_text,
           question = EXCLUDED.question,
           answer_key = EXCLUDED.answer_key,
           scoring_rubric = EXCLUDED.scoring_rubric,
           encouragement_correct = EXCLUDED.encouragement_correct,
           encouragement_wrong = EXCLUDED.encouragement_wrong,
           hint_text = EXCLUDED.hint_text,
           title = EXCLUDED.title,
           vocabulary = EXCLUDED.vocabulary`,
        [
          item.skill_id,
          item.reading_level || '2nd-3rd',
          item.difficulty || 'easy',
          parseInt(item.id?.replace(/\D/g, '') || '0') || inserted + 100,
          item.passage || item.passage_text || '',
          // For multi-choice, store the question + options in question field
          item.questions?.[0]?.question || item.question || '',
          // answer_key: the correct option text or index
          item.questions?.[0]
            ? (item.questions[0].options?.[item.questions[0].correct] || String(item.questions[0].correct))
            : (item.answer_key || ''),
          // scoring_rubric: for MC, store options + correct index
          JSON.stringify(
            item.questions?.[0]
              ? { type: 'multiple_choice', options: item.questions[0].options, correct: item.questions[0].correct, explanation: item.questions[0].explanation }
              : (item.scoring_rubric || {})
          ),
          item.age_appropriate_context || `${kid || 'general'} interest content`,
          item.interest_tags?.[0] || kid || 'general',
          item.encouragement_correct || null,
          item.encouragement_wrong || null,
          item.hint || item.hint_text || null,
          item.title || null,
          item.vocabulary ? JSON.stringify(item.vocabulary) : null,
        ]
      )
      inserted++
    } else if (item.subject === 'math') {
      await pool.query(
        `INSERT INTO math_placement_problems
           (skill_id, math_level, difficulty, problem_number, problem_text, answer,
            answer_type, choices, explanation, age_appropriate_context,
            encouragement_correct, encouragement_wrong, hint_text, title,
            solution_steps, answer_display)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (skill_id, math_level, problem_number) DO UPDATE SET
           problem_text = EXCLUDED.problem_text,
           answer = EXCLUDED.answer,
           choices = EXCLUDED.choices,
           explanation = EXCLUDED.explanation,
           encouragement_correct = EXCLUDED.encouragement_correct,
           encouragement_wrong = EXCLUDED.encouragement_wrong,
           hint_text = EXCLUDED.hint_text,
           title = EXCLUDED.title,
           solution_steps = EXCLUDED.solution_steps,
           answer_display = EXCLUDED.answer_display`,
        [
          item.skill_id,
          item.reading_level || item.math_level || '2nd-3rd',
          item.difficulty || 'easy',
          parseInt(item.id?.replace(/\D/g, '') || '0') || inserted + 100,
          item.problem || item.problem_text || '',
          String(item.answer ?? ''),
          item.answer_type || (item.options ? 'multiple_choice' : 'numeric'),
          item.options ? JSON.stringify(item.options) : null,
          item.explanation || item.questions?.[0]?.explanation || null,
          item.age_appropriate_context || `${kid || 'general'} interest content`,
          item.encouragement_correct || null,
          item.encouragement_wrong || null,
          item.hint || item.hint_text || null,
          item.title || null,
          item.solution_steps ? JSON.stringify(item.solution_steps) : null,
          item.answer_display || null,
        ]
      )
      inserted++
    } else {
      console.warn(`  Skipping ${item.id}: unknown subject "${item.subject}"`)
      skipped++
    }
  } catch (e) {
    console.error(`  Error on ${item.id}: ${e.message}`)
    errors++
  }
}

console.log(`\nDone: ${inserted} inserted, ${skipped} skipped, ${errors} errors`)
await pool.end()
