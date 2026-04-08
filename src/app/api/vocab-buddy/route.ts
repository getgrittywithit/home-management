import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

async function ensureTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS vocab_words (
      id SERIAL PRIMARY KEY,
      word TEXT NOT NULL,
      definition TEXT NOT NULL,
      example_sentence TEXT,
      grade_level INTEGER DEFAULT 4,
      source TEXT DEFAULT 'general',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS vocab_progress (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      word_id INTEGER NOT NULL REFERENCES vocab_words(id),
      status TEXT NOT NULL DEFAULT 'seen',
      correct_count INTEGER DEFAULT 0,
      attempts INTEGER DEFAULT 0,
      mastered_at TIMESTAMPTZ,
      last_practiced TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(kid_name, word_id)
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS vocab_sessions (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      game_mode TEXT NOT NULL,
      words_attempted INTEGER DEFAULT 0,
      words_correct INTEGER DEFAULT 0,
      gems_earned INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

let ready = false
async function init() { if (!ready) { await ensureTables(); ready = true } }

// Get today's word (deterministic per day + kid)
function getDailyWordOffset(kidName: string): number {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const combined = today + kidName
  const hash = Array.from(combined).reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return hash
}

export async function GET(req: NextRequest) {
  await init()
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_daily_word'
  const kid = searchParams.get('kid_name')?.toLowerCase()

  try {
    if (action === 'get_daily_word') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const count = (await db.query(`SELECT COUNT(*)::int as c FROM vocab_words`).catch(() => []))[0]?.c || 0
      if (count === 0) return NextResponse.json({ word: null, message: 'No words available yet' })
      const offset = getDailyWordOffset(kid) % count
      const word = (await db.query(`SELECT * FROM vocab_words ORDER BY id LIMIT 1 OFFSET $1`, [offset]).catch(() => []))[0]
      if (!word) return NextResponse.json({ word: null })
      // Get progress
      const progress = (await db.query(
        `SELECT * FROM vocab_progress WHERE kid_name = $1 AND word_id = $2`, [kid, word.id]
      ).catch(() => []))[0]
      return NextResponse.json({ word, progress: progress || { status: 'new', correct_count: 0, attempts: 0 } })
    }

    if (action === 'get_word_list') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const limit = parseInt(searchParams.get('limit') || '20')
      const words = await db.query(
        `SELECT w.*, COALESCE(p.status, 'new') as progress_status, COALESCE(p.correct_count, 0) as correct_count
         FROM vocab_words w
         LEFT JOIN vocab_progress p ON w.id = p.word_id AND p.kid_name = $1
         ORDER BY w.id LIMIT $2`, [kid, limit]
      ).catch(() => [])
      return NextResponse.json({ words })
    }

    if (action === 'get_mastery_stats') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const total = (await db.query(`SELECT COUNT(*)::int as c FROM vocab_words`).catch(() => []))[0]?.c || 0
      const seen = (await db.query(`SELECT COUNT(*)::int as c FROM vocab_progress WHERE kid_name = $1 AND status != 'new'`, [kid]).catch(() => []))[0]?.c || 0
      const practiced = (await db.query(`SELECT COUNT(*)::int as c FROM vocab_progress WHERE kid_name = $1 AND status = 'practiced'`, [kid]).catch(() => []))[0]?.c || 0
      const mastered = (await db.query(`SELECT COUNT(*)::int as c FROM vocab_progress WHERE kid_name = $1 AND status = 'mastered'`, [kid]).catch(() => []))[0]?.c || 0
      return NextResponse.json({ total, seen, practiced, mastered })
    }

    if (action === 'get_game_words') {
      // Get words for a game session (prioritize unmastered)
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const mode = searchParams.get('mode') || 'fill_blank'
      const count = parseInt(searchParams.get('count') || '5')
      const words = await db.query(
        `SELECT w.* FROM vocab_words w
         LEFT JOIN vocab_progress p ON w.id = p.word_id AND p.kid_name = $1
         WHERE COALESCE(p.status, 'new') != 'mastered'
         ORDER BY RANDOM() LIMIT $2`, [kid, count]
      ).catch(() => [])
      // For fill_blank, generate distractors
      if (mode === 'fill_blank') {
        for (const word of words) {
          const distractors = await db.query(
            `SELECT word FROM vocab_words WHERE id != $1 ORDER BY RANDOM() LIMIT 3`, [word.id]
          ).catch(() => [])
          word.distractors = distractors.map((d: any) => d.word)
        }
      }
      return NextResponse.json({ words })
    }

    if (action === 'get_session_history') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const rows = await db.query(
        `SELECT * FROM vocab_sessions WHERE kid_name = $1 ORDER BY created_at DESC LIMIT 20`, [kid]
      ).catch(() => [])
      return NextResponse.json({ sessions: rows })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Vocab buddy GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  await init()
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'record_answer') {
      const { kid_name, word_id, correct } = body
      if (!kid_name || !word_id) return NextResponse.json({ error: 'kid_name, word_id required' }, { status: 400 })
      const kid = kid_name.toLowerCase()

      // Upsert progress
      const existing = (await db.query(
        `SELECT * FROM vocab_progress WHERE kid_name = $1 AND word_id = $2`, [kid, word_id]
      ).catch(() => []))[0]

      const newCorrect = (existing?.correct_count || 0) + (correct ? 1 : 0)
      const newAttempts = (existing?.attempts || 0) + 1
      const newStatus = newCorrect >= 3 ? 'mastered' : newAttempts > 0 ? 'practiced' : 'seen'

      await db.query(
        `INSERT INTO vocab_progress (kid_name, word_id, status, correct_count, attempts, last_practiced, mastered_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6)
         ON CONFLICT (kid_name, word_id) DO UPDATE SET
           status = $3, correct_count = $4, attempts = $5, last_practiced = NOW(),
           mastered_at = CASE WHEN $3 = 'mastered' AND vocab_progress.mastered_at IS NULL THEN NOW() ELSE vocab_progress.mastered_at END`,
        [kid, word_id, newStatus, newCorrect, newAttempts, newStatus === 'mastered' ? new Date().toISOString() : null]
      )

      return NextResponse.json({ success: true, status: newStatus, correct_count: newCorrect, attempts: newAttempts })
    }

    if (action === 'complete_session') {
      const { kid_name, game_mode, words_attempted, words_correct } = body
      if (!kid_name || !game_mode) return NextResponse.json({ error: 'kid_name, game_mode required' }, { status: 400 })
      const kid = kid_name.toLowerCase()
      const isPerfect = words_correct === words_attempted && words_attempted > 0
      const gemsEarned = isPerfect ? 5 : (words_attempted > 0 ? 2 : 0)

      await db.query(
        `INSERT INTO vocab_sessions (kid_name, game_mode, words_attempted, words_correct, gems_earned) VALUES ($1, $2, $3, $4, $5)`,
        [kid, game_mode, words_attempted || 0, words_correct || 0, gemsEarned]
      )

      // Award gems
      if (gemsEarned > 0) {
        await db.query(`UPDATE digi_pets SET gem_balance = COALESCE(gem_balance, 0) + $1 WHERE kid_name = $2`, [gemsEarned, kid]).catch(() => {})
        await db.query(
          `INSERT INTO gem_transactions (kid_name, amount, source_type, description) VALUES ($1, $2, 'vocab_session', $3)`,
          [kid, gemsEarned, `Vocab ${game_mode}: ${words_correct}/${words_attempted}${isPerfect ? ' (perfect!)' : ''}`]
        ).catch(() => {})
      }

      return NextResponse.json({ success: true, gems_earned: gemsEarned, perfect: isPerfect })
    }

    if (action === 'add_word') {
      const { word, definition, example_sentence, grade_level, source } = body
      if (!word || !definition) return NextResponse.json({ error: 'word, definition required' }, { status: 400 })
      const rows = await db.query(
        `INSERT INTO vocab_words (word, definition, example_sentence, grade_level, source) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [word, definition, example_sentence || null, grade_level || 4, source || 'manual']
      )
      return NextResponse.json({ success: true, word: rows[0] })
    }

    if (action === 'bulk_add_words') {
      const { words } = body
      if (!words || !Array.isArray(words)) return NextResponse.json({ error: 'words array required' }, { status: 400 })
      let added = 0
      for (const w of words) {
        if (!w.word || !w.definition) continue
        await db.query(
          `INSERT INTO vocab_words (word, definition, example_sentence, grade_level, source) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
          [w.word, w.definition, w.example_sentence || null, w.grade_level || 4, w.source || 'bulk']
        ).catch(() => {})
        added++
      }
      return NextResponse.json({ success: true, added })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Vocab buddy POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
