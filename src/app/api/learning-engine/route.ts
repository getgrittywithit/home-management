import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

const ELAR_SKILLS: Record<string, string> = {
  R1: 'Main Idea & Summary', R2: 'Character Analysis', R3: 'Setting & Mood',
  R4: 'Plot & Conflict', R5: 'Theme', R6: 'Point of View',
  R7: "Author's Purpose", R8: 'Text Features', R9: 'Vocabulary in Context',
  R10: 'Inference', R11: 'Compare & Contrast', R12: 'Fact vs Opinion',
  W1: 'Sentence Structure', W2: 'Grammar & Conventions', W3: 'Writing Response',
}

const MATH_SKILLS: Record<string, string> = {
  M1: 'Number Sense', M2: 'Addition & Subtraction', M3: 'Multiplication & Division',
  M4: 'Fractions', M5: 'Decimals', M6: 'Measurement & Data',
  M7: 'Geometry', M8: 'Patterns & Algebraic Thinking', M9: 'Word Problems',
  M10: 'Time & Money', M11: 'Graphs & Data Analysis', M12: 'Estimation & Rounding',
}

const MILESTONES = [
  { name: 'Pathfinder', min: 0, max: 15, stars: 50 },
  { name: 'Discoverer', min: 16, max: 35, stars: 75 },
  { name: 'Practitioner', min: 36, max: 55, stars: 100 },
  { name: 'Proficient', min: 56, max: 75, stars: 150 },
  { name: 'Expert', min: 76, max: 85, stars: 200 },
  { name: 'Scholar', min: 86, max: 95, stars: 250 },
  { name: 'Maestro', min: 96, max: 100, stars: 300 },
]

function getMilestone(mastery: number) {
  return MILESTONES.find(m => mastery >= m.min && mastery <= m.max) || MILESTONES[0]
}

// 50/30/20 Adaptive Skill Selection
async function selectNextSkill(kidName: string, subject: 'elar' | 'math'): Promise<{ skillId: string; reason: string }> {
  const table = subject === 'elar' ? 'kid_elar_progress' : 'kid_math_progress'
  const skills = await db.query(`SELECT skill_id, current_mastery, last_practiced FROM ${table} WHERE kid_name = $1`, [kidName]).catch(() => [])

  if (skills.length === 0) {
    return { skillId: subject === 'elar' ? 'R1' : 'M1', reason: 'No progress yet — starting with first skill' }
  }

  const rand = Math.random()

  // 50%: Active Focus — lowest mastery < 80, not practiced in 3+ days
  if (rand < 0.5) {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000)
    const candidates = skills.filter((s: any) => s.current_mastery < 80 && (!s.last_practiced || new Date(s.last_practiced) < threeDaysAgo))
    if (candidates.length > 0) {
      candidates.sort((a: any, b: any) => a.current_mastery - b.current_mastery)
      return { skillId: candidates[0].skill_id, reason: 'Active Focus (lowest mastery, needs practice)' }
    }
  }

  // 30%: Spiral Review — mastery >= 80, oldest last_practiced
  if (rand < 0.8) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
    const candidates = skills.filter((s: any) => s.current_mastery >= 80 && s.last_practiced && new Date(s.last_practiced) < sevenDaysAgo)
    if (candidates.length > 0) {
      candidates.sort((a: any, b: any) => new Date(a.last_practiced).getTime() - new Date(b.last_practiced).getTime())
      return { skillId: candidates[0].skill_id, reason: 'Spiral Review (maintaining proficiency)' }
    }
  }

  // 20%: Challenge Stretch — mastery >= 85, try adjacent skill
  const highMastery = skills.filter((s: any) => s.current_mastery >= 85)
  if (highMastery.length > 0) {
    const allSkillIds = Object.keys(subject === 'elar' ? ELAR_SKILLS : MATH_SKILLS)
    const practicedIds = new Set(skills.map((s: any) => s.skill_id))
    const unpracticed = allSkillIds.filter(id => !practicedIds.has(id))
    if (unpracticed.length > 0) {
      return { skillId: unpracticed[0], reason: 'Challenge Stretch (new skill unlocked)' }
    }
  }

  // Fallback: lowest mastery overall
  skills.sort((a: any, b: any) => a.current_mastery - b.current_mastery)
  return { skillId: skills[0].skill_id, reason: 'Focus on weakest skill' }
}

async function aiScoreElar(passage: string, question: string, response: string, skillName: string, kidName: string): Promise<{ score: string; points: number; feedback: string }> {
  if (!ANTHROPIC_API_KEY) {
    // Fallback scoring without AI
    const len = response.trim().length
    if (len === 0) return { score: 'skipped', points: 0, feedback: 'No response — try giving it a shot!' }
    if (len > 100) return { score: 'detailed', points: 15, feedback: 'Great detail in your response!' }
    if (len > 30) return { score: 'adequate', points: 10, feedback: 'Good answer — can you add more detail?' }
    return { score: 'vague', points: 5, feedback: 'You started well — try to explain more next time.' }
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 300,
        system: `You score reading comprehension for ${kidName}. Skill: ${skillName}. Score as: detailed (15pts, comprehensive with evidence), adequate (10pts, correct main idea), vague (5pts, partially correct), or skipped (0pts). Be encouraging. 2 sentences max feedback. Return JSON: {"score":"...","points":N,"feedback":"..."}`,
        messages: [{ role: 'user', content: `Passage: ${passage.substring(0, 500)}\nQuestion: ${question}\nStudent response: ${response}` }],
      }),
    })
    const data = await res.json()
    const text = data.content?.[0]?.text || ''
    const match = text.match(/\{[^}]+\}/)
    if (match) return JSON.parse(match[0])
  } catch (e) { console.error('ELAR AI scoring error:', e) }

  return { score: 'adequate', points: 10, feedback: 'Good effort! Keep practicing.' }
}

async function aiScoreMath(problem: string, kidAnswer: string, correctAnswer: string, skillName: string, kidName: string): Promise<{ is_correct: boolean; is_partial: boolean; points: number; feedback: string }> {
  // Quick exact match first
  const normalizedKid = kidAnswer.trim().toLowerCase().replace(/[,$%]/g, '')
  const normalizedCorrect = correctAnswer.trim().toLowerCase().replace(/[,$%]/g, '')
  if (normalizedKid === normalizedCorrect) {
    return { is_correct: true, is_partial: false, points: 15, feedback: 'Correct! Great work.' }
  }

  // Try numeric comparison
  const kidNum = parseFloat(normalizedKid)
  const correctNum = parseFloat(normalizedCorrect)
  if (!isNaN(kidNum) && !isNaN(correctNum) && Math.abs(kidNum - correctNum) < 0.01) {
    return { is_correct: true, is_partial: false, points: 15, feedback: 'Correct!' }
  }

  if (!ANTHROPIC_API_KEY) {
    return { is_correct: false, is_partial: false, points: 0, feedback: `The answer is ${correctAnswer}. Keep practicing!` }
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 200,
        system: `You score math for ${kidName}. Skill: ${skillName}. Check if student answer matches correct answer. Allow equivalent forms (1/2 = 0.5). Give partial credit for correct method with computation error. Be encouraging. Return JSON: {"is_correct":bool,"is_partial":bool,"points":N,"feedback":"..."}. Points: correct=15, partial=5, incorrect=0.`,
        messages: [{ role: 'user', content: `Problem: ${problem}\nCorrect answer: ${correctAnswer}\nStudent answer: ${kidAnswer}` }],
      }),
    })
    const data = await res.json()
    const text = data.content?.[0]?.text || ''
    const match = text.match(/\{[^}]+\}/)
    if (match) return JSON.parse(match[0])
  } catch (e) { console.error('Math AI scoring error:', e) }

  return { is_correct: false, is_partial: false, points: 0, feedback: `The answer is ${correctAnswer}. You'll get it next time!` }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const kidName = searchParams.get('kid_name')?.toLowerCase()

  try {
    switch (action) {
      // Journey Maps
      case 'elar_journey_map': {
        if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const skills = await db.query(
          `SELECT skill_id, skill_name, current_mastery, questions_attempted, questions_correct, streak, longest_streak, last_practiced
           FROM kid_elar_progress WHERE kid_name = $1 ORDER BY skill_id`,
          [kidName]
        ).catch(() => [])
        const mapped = skills.map((s: any) => ({ ...s, milestone: getMilestone(s.current_mastery) }))
        return NextResponse.json({ kid_name: kidName, skills: mapped, skill_names: ELAR_SKILLS })
      }

      case 'math_journey_map': {
        if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const skills = await db.query(
          `SELECT skill_id, skill_name, current_mastery, questions_attempted, questions_correct, streak, longest_streak, last_practiced
           FROM kid_math_progress WHERE kid_name = $1 ORDER BY skill_id`,
          [kidName]
        ).catch(() => [])
        const mapped = skills.map((s: any) => ({ ...s, milestone: getMilestone(s.current_mastery) }))
        return NextResponse.json({ kid_name: kidName, skills: mapped, skill_names: MATH_SKILLS })
      }

      // Next skill selection (50/30/20)
      case 'next_elar_skill': {
        if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const { skillId, reason } = await selectNextSkill(kidName, 'elar')
        const progress = await db.query(
          `SELECT current_mastery FROM kid_elar_progress WHERE kid_name = $1 AND skill_id = $2`,
          [kidName, skillId]
        ).catch(() => [])
        return NextResponse.json({
          skill_id: skillId, skill_name: ELAR_SKILLS[skillId] || skillId,
          current_mastery: progress[0]?.current_mastery || 0, reason,
          session_id: `elar-${kidName}-${Date.now()}`,
        })
      }

      case 'next_math_skill': {
        if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const { skillId, reason } = await selectNextSkill(kidName, 'math')
        const progress = await db.query(
          `SELECT current_mastery FROM kid_math_progress WHERE kid_name = $1 AND skill_id = $2`,
          [kidName, skillId]
        ).catch(() => [])
        return NextResponse.json({
          skill_id: skillId, skill_name: MATH_SKILLS[skillId] || skillId,
          current_mastery: progress[0]?.current_mastery || 0, reason,
          session_id: `math-${kidName}-${Date.now()}`,
        })
      }

      // Placement passages/problems
      case 'elar_placement_passages': {
        const skillId = searchParams.get('skill_id')
        const level = searchParams.get('level') || '2nd-3rd'
        const interestTag = searchParams.get('interest_tag')?.toLowerCase() || null
        if (!skillId) return NextResponse.json({ error: 'skill_id required' }, { status: 400 })

        // Prefer passages matching the kid's interest_tag, then 'general', then
        // any other audience (last resort). DISTINCT ON collapses the candidates
        // per slot so every (skill, level) returns up to 3 passages — one per
        // passage_number — regardless of tag coverage. This guarantees a kid
        // without content tagged for them still gets a usable quiz.
        const rows = await db.query(
          `SELECT DISTINCT ON (passage_number)
                  id, skill_id, reading_level, difficulty, passage_number,
                  passage_text, question, answer_key, scoring_rubric,
                  age_appropriate_context, interest_tag,
                  encouragement_correct, encouragement_wrong, hint_text, title, vocabulary
           FROM elar_placement_passages
           WHERE skill_id = $1 AND reading_level = $2
           ORDER BY passage_number,
             CASE interest_tag
               WHEN COALESCE($3, 'general') THEN 0
               WHEN 'general' THEN 1
               ELSE 2
             END
           LIMIT 3`,
          [skillId, level, interestTag]
        ).catch(() => [])
        return NextResponse.json({ passages: rows })
      }

      case 'math_placement_problems': {
        const skillId = searchParams.get('skill_id')
        const level = searchParams.get('level') || '2nd-3rd'
        if (!skillId) return NextResponse.json({ error: 'skill_id required' }, { status: 400 })
        const rows = await db.query(
          `SELECT id, skill_id, math_level, difficulty, problem_text, answer, answer_type,
                  choices, explanation, age_appropriate_context,
                  encouragement_correct, encouragement_wrong, hint_text, title,
                  solution_steps, answer_display
           FROM math_placement_problems WHERE skill_id = $1 AND math_level = $2 ORDER BY problem_number LIMIT 4`,
          [skillId, level]
        ).catch(() => [])
        return NextResponse.json({ problems: rows })
      }

      // Academic records
      case 'academic_records': {
        if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const recordType = searchParams.get('record_type')
        let sql = `SELECT * FROM academic_records WHERE kid_name = $1`
        const params: any[] = [kidName]
        if (recordType) { sql += ` AND record_type = $2`; params.push(recordType) }
        sql += ` ORDER BY created_at DESC LIMIT 20`
        const rows = await db.query(sql, params).catch(() => [])
        return NextResponse.json({ records: rows })
      }

      // Financial literacy progress
      case 'financial_progress': {
        if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const rows = await db.query(
          `SELECT * FROM financial_literacy_progress WHERE kid_name = $1`,
          [kidName]
        ).catch(() => [])
        return NextResponse.json({ progress: rows[0] || { current_level: 1 } })
      }

      // ── VOCAB-MIX-1 ──
      case 'get_vocab_words': {
        if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const words = await db.query(
          `SELECT id, word, definition, book_title, created_at FROM kid_vocab_words
           WHERE kid_name = $1 ORDER BY created_at DESC`,
          [kidName]
        ).catch(() => [])
        return NextResponse.json({ words })
      }

      case 'get_vocab_history': {
        if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const sessions = await db.query(
          `SELECT vs.id, vs.word_count, vs.quiz_type, vs.created_at,
                  vq.id as quiz_id, vq.score, vq.max_score, vq.completed_at
           FROM vocab_mixer_sessions vs
           LEFT JOIN vocab_quizzes vq ON vq.session_id = vs.id
           WHERE vs.kid_name = $1 ORDER BY vs.created_at DESC LIMIT 20`,
          [kidName]
        ).catch(() => [])
        return NextResponse.json({ history: sessions })
      }

      // ── WORKBOOK-1 ──
      case 'get_workbooks': {
        if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const progress = await db.query(
          `SELECT workbook_name, page_number, skill_tags, completed, completed_at, notes
           FROM kid_workbook_progress WHERE kid_name = $1 ORDER BY workbook_name, page_number`,
          [kidName]
        ).catch(() => [])
        // Group by workbook
        const workbooks: Record<string, any[]> = {}
        progress.forEach((p: any) => {
          if (!workbooks[p.workbook_name]) workbooks[p.workbook_name] = []
          workbooks[p.workbook_name].push(p)
        })
        return NextResponse.json({ workbooks })
      }

      case 'get_workbook_skills': {
        if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const rows = await db.query(
          `SELECT skill_tag, COUNT(*)::int as page_count
           FROM kid_workbook_progress, jsonb_array_elements_text(skill_tags) AS skill_tag
           WHERE kid_name = $1 AND completed = TRUE
           GROUP BY skill_tag ORDER BY page_count DESC`,
          [kidName]
        ).catch(() => [])
        return NextResponse.json({ skills: rows })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Learning engine GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  try {
    switch (action) {
      // Book Buddy scoring
      case 'book_buddy_score': {
        const { kid_name, skill_id, passage_id, kid_response, passage_text, question, session_id } = body
        if (!kid_name || !skill_id || !kid_response) return NextResponse.json({ error: 'kid_name, skill_id, kid_response required' }, { status: 400 })
        const kid = kid_name.toLowerCase()
        const skillName = ELAR_SKILLS[skill_id] || skill_id

        // AI score
        const { score, points, feedback } = await aiScoreElar(passage_text || '', question || '', kid_response, skillName, kid_name)

        // Get current mastery
        const progress = await db.query(
          `SELECT current_mastery, questions_attempted, questions_correct, streak, longest_streak FROM kid_elar_progress WHERE kid_name = $1 AND skill_id = $2`,
          [kid, skill_id]
        ).catch(() => [])

        const before = progress[0]?.current_mastery || 0
        const attempted = (progress[0]?.questions_attempted || 0) + 1
        const correct = (progress[0]?.questions_correct || 0) + (score === 'detailed' || score === 'adequate' ? 1 : 0)
        // Mastery builds gradually: requires minimum 5 attempts before reaching high mastery
        const effectiveAttempts = Math.max(attempted, 5)
        const newMastery = Math.max(before, Math.min(100, Math.round((correct / effectiveAttempts) * 100)))
        const streak = score === 'detailed' || score === 'adequate' ? (progress[0]?.streak || 0) + 1 : 0
        const longestStreak = Math.max(progress[0]?.longest_streak || 0, streak)

        // Upsert progress (mastery only goes up)
        await db.query(
          `INSERT INTO kid_elar_progress (kid_name, skill_id, skill_name, current_mastery, questions_attempted, questions_correct, streak, longest_streak, last_practiced, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           ON CONFLICT (kid_name, skill_id) DO UPDATE SET
             current_mastery = GREATEST(kid_elar_progress.current_mastery, $4),
             questions_attempted = $5, questions_correct = $6, streak = $7,
             longest_streak = GREATEST(kid_elar_progress.longest_streak, $8),
             last_practiced = NOW(), updated_at = NOW()`,
          [kid, skill_id, skillName, newMastery, attempted, correct, streak, longestStreak]
        ).catch(e => console.error('ELAR progress update failed:', e.message))

        // Log response
        await db.query(
          `INSERT INTO book_buddy_responses (kid_name, skill_id, passage_id, passage_text, question, kid_response, ai_score, ai_feedback, points_earned, mastery_before, mastery_after, mastery_delta, session_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [kid, skill_id, passage_id || null, (passage_text || '').substring(0, 1000), question || null, kid_response, score, feedback, points, before, newMastery, newMastery - before, session_id || null]
        ).catch(e => console.error('Book buddy log failed:', e.message))

        // Star awards: reasonable amounts (1-5 base, milestone bonuses capped at 25)
        let starsEarned = (score === 'detailed' || score === 'adequate') ? 3 : 1
        if (streak >= 5 && streak % 5 === 0) starsEarned += 2
        const oldMilestone = getMilestone(before)
        const newMilestoneObj = getMilestone(newMastery)
        let milestoneReached: string | null = null
        if (newMilestoneObj.name !== oldMilestone.name && newMastery > before) {
          starsEarned += Math.min(25, Math.round(newMilestoneObj.stars / 10))
          milestoneReached = newMilestoneObj.name
        }

        return NextResponse.json({
          score, points, feedback,
          mastery_before: before, mastery_after: newMastery, mastery_delta: newMastery - before,
          stars_earned: starsEarned, milestone_reached: milestoneReached,
          streak, skill_name: skillName,
        })
      }

      // Math Buddy scoring
      case 'math_buddy_score': {
        const { kid_name, skill_id, problem_id, kid_answer, correct_answer, problem_text, session_id } = body
        if (!kid_name || !skill_id || !kid_answer) return NextResponse.json({ error: 'kid_name, skill_id, kid_answer required' }, { status: 400 })
        const kid = kid_name.toLowerCase()
        const skillName = MATH_SKILLS[skill_id] || skill_id

        const { is_correct, is_partial, points, feedback } = await aiScoreMath(problem_text || '', kid_answer, correct_answer || '', skillName, kid_name)

        const progress = await db.query(
          `SELECT current_mastery, questions_attempted, questions_correct, streak, longest_streak FROM kid_math_progress WHERE kid_name = $1 AND skill_id = $2`,
          [kid, skill_id]
        ).catch(() => [])

        const before = progress[0]?.current_mastery || 0
        const attempted = (progress[0]?.questions_attempted || 0) + 1
        const correct = (progress[0]?.questions_correct || 0) + (is_correct ? 1 : 0)
        // Mastery builds gradually: requires minimum 5 attempts before reaching high mastery
        // Formula: (correct/max(attempted, 5)) * 100, capped, never decreases
        const effectiveAttempts = Math.max(attempted, 5)
        const newMastery = Math.max(before, Math.min(100, Math.round((correct / effectiveAttempts) * 100)))
        const streak = is_correct ? (progress[0]?.streak || 0) + 1 : 0
        const longestStreak = Math.max(progress[0]?.longest_streak || 0, streak)

        await db.query(
          `INSERT INTO kid_math_progress (kid_name, skill_id, skill_name, current_mastery, questions_attempted, questions_correct, streak, longest_streak, last_practiced, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           ON CONFLICT (kid_name, skill_id) DO UPDATE SET
             current_mastery = GREATEST(kid_math_progress.current_mastery, $4),
             questions_attempted = $5, questions_correct = $6, streak = $7,
             longest_streak = GREATEST(kid_math_progress.longest_streak, $8),
             last_practiced = NOW(), updated_at = NOW()`,
          [kid, skill_id, skillName, newMastery, attempted, correct, streak, longestStreak]
        ).catch(e => console.error('Math progress update failed:', e.message))

        await db.query(
          `INSERT INTO math_buddy_responses (kid_name, skill_id, problem_id, problem_text, kid_answer, correct_answer, is_correct, is_partial, ai_feedback, points_earned, mastery_before, mastery_after, mastery_delta, session_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [kid, skill_id, problem_id || null, (problem_text || '').substring(0, 1000), kid_answer, correct_answer, is_correct, is_partial, feedback, points, before, newMastery, newMastery - before, session_id || null]
        ).catch(e => console.error('Math buddy log failed:', e.message))

        // Star awards: reasonable amounts (2-5 base, milestone one-time bonuses capped)
        let starsEarned = is_correct ? 3 : 1
        if (streak >= 5 && streak % 5 === 0) starsEarned += 2
        const oldMs = getMilestone(before)
        const newMs = getMilestone(newMastery)
        let milestoneReached: string | null = null
        if (newMs.name !== oldMs.name && newMastery > before) {
          // Milestone bonuses: 5-25 stars (one-time per tier), not 50-300
          const milestoneBonus = Math.min(25, Math.round(newMs.stars / 10))
          starsEarned += milestoneBonus
          milestoneReached = newMs.name
        }

        return NextResponse.json({
          is_correct, is_partial, points, feedback,
          mastery_before: before, mastery_after: newMastery, mastery_delta: newMastery - before,
          stars_earned: starsEarned, milestone_reached: milestoneReached,
          streak, skill_name: skillName,
        })
      }

      // Placement completion
      case 'elar_placement_complete': {
        const { kid_name, skill_id, placed_at_level, total_points, passages_attempted, raw_responses } = body
        if (!kid_name || !skill_id) return NextResponse.json({ error: 'kid_name and skill_id required' }, { status: 400 })
        const kid = kid_name.toLowerCase()
        const startingMastery = Math.min(100, Math.round((total_points / 45) * 100))

        await db.query(
          `INSERT INTO elar_placement_results (kid_name, skill_id, starting_mastery, placed_at_level, passages_attempted, raw_responses, placement_date)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (kid_name, skill_id) DO UPDATE SET starting_mastery = $3, placed_at_level = $4, passages_attempted = $5, raw_responses = $6, placement_date = NOW()`,
          [kid, skill_id, startingMastery, placed_at_level || null, JSON.stringify(passages_attempted || []), JSON.stringify(raw_responses || [])]
        )

        await db.query(
          `INSERT INTO kid_elar_progress (kid_name, skill_id, skill_name, current_mastery, last_practiced)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (kid_name, skill_id) DO UPDATE SET current_mastery = GREATEST(kid_elar_progress.current_mastery, $4), last_practiced = NOW()`,
          [kid, skill_id, ELAR_SKILLS[skill_id] || skill_id, startingMastery]
        )

        return NextResponse.json({ success: true, starting_mastery: startingMastery })
      }

      case 'math_placement_complete': {
        const { kid_name, skill_id, placed_at_level, total_points, problems_attempted, raw_responses } = body
        if (!kid_name || !skill_id) return NextResponse.json({ error: 'kid_name and skill_id required' }, { status: 400 })
        const kid = kid_name.toLowerCase()
        const startingMastery = Math.min(100, Math.round((total_points / 60) * 100))

        await db.query(
          `INSERT INTO math_placement_results (kid_name, skill_id, starting_mastery, placed_at_level, problems_attempted, raw_responses, placement_date)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (kid_name, skill_id) DO UPDATE SET starting_mastery = $3, placed_at_level = $4, problems_attempted = $5, raw_responses = $6, placement_date = NOW()`,
          [kid, skill_id, startingMastery, placed_at_level || null, JSON.stringify(problems_attempted || []), JSON.stringify(raw_responses || [])]
        )

        await db.query(
          `INSERT INTO kid_math_progress (kid_name, skill_id, skill_name, current_mastery, last_practiced)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (kid_name, skill_id) DO UPDATE SET current_mastery = GREATEST(kid_math_progress.current_mastery, $4), last_practiced = NOW()`,
          [kid, skill_id, MATH_SKILLS[skill_id] || skill_id, startingMastery]
        )

        return NextResponse.json({ success: true, starting_mastery: startingMastery })
      }

      // Parent mastery override
      case 'elar_progress_override': {
        const { kid_name, skill_id, new_mastery, reason } = body
        if (!kid_name || !skill_id || new_mastery === undefined) return NextResponse.json({ error: 'kid_name, skill_id, new_mastery required' }, { status: 400 })
        await db.query(
          `UPDATE kid_elar_progress SET current_mastery = $3, updated_at = NOW() WHERE kid_name = $1 AND skill_id = $2`,
          [kid_name.toLowerCase(), skill_id, Math.max(0, Math.min(100, new_mastery))]
        )
        return NextResponse.json({ success: true })
      }

      case 'math_progress_override': {
        const { kid_name, skill_id, new_mastery } = body
        if (!kid_name || !skill_id || new_mastery === undefined) return NextResponse.json({ error: 'kid_name, skill_id, new_mastery required' }, { status: 400 })
        await db.query(
          `UPDATE kid_math_progress SET current_mastery = $3, updated_at = NOW() WHERE kid_name = $1 AND skill_id = $2`,
          [kid_name.toLowerCase(), skill_id, Math.max(0, Math.min(100, new_mastery))]
        )
        return NextResponse.json({ success: true })
      }

      // Financial literacy
      case 'advance_financial_level': {
        const { kid_name } = body
        if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const kid = kid_name.toLowerCase()
        const progress = await db.query(`SELECT * FROM financial_literacy_progress WHERE kid_name = $1`, [kid]).catch(() => [])
        if (!progress[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        const lvl = progress[0].current_level
        if (lvl >= 6) return NextResponse.json({ error: 'Already at max level' }, { status: 400 })
        await db.query(
          `UPDATE financial_literacy_progress SET level_${lvl}_complete = TRUE, current_level = $2, updated_at = NOW() WHERE kid_name = $1`,
          [kid, lvl + 1]
        )
        const kidDisplay = kid.charAt(0).toUpperCase() + kid.slice(1)
        await createNotification({
          title: `${kidDisplay} reached Financial Literacy Level ${lvl + 1}!`,
          message: `Advanced from Level ${lvl}`, source_type: 'financial_level_advance',
          source_ref: `fin-level-${kid}-${lvl + 1}`, link_tab: 'school', icon: '🎓',
        }).catch(() => {})
        return NextResponse.json({ success: true, new_level: lvl + 1 })
      }

      case 'financial_literacy_override': {
        const { kid_name, new_level } = body
        if (!kid_name || !new_level) return NextResponse.json({ error: 'kid_name and new_level required' }, { status: 400 })
        await db.query(
          `UPDATE financial_literacy_progress SET current_level = $2, updated_at = NOW() WHERE kid_name = $1`,
          [kid_name.toLowerCase(), Math.max(1, Math.min(6, new_level))]
        )
        return NextResponse.json({ success: true })
      }

      // Generate academic record
      case 'generate_academic_record': {
        const { kid_name, record_type, subject, period_start, period_end, parent_notes } = body
        if (!kid_name || !record_type) return NextResponse.json({ error: 'kid_name and record_type required' }, { status: 400 })
        const kid = kid_name.toLowerCase()

        // Gather data
        const elarProgress = await db.query(`SELECT * FROM kid_elar_progress WHERE kid_name = $1`, [kid]).catch(() => [])
        const mathProgress = await db.query(`SELECT * FROM kid_math_progress WHERE kid_name = $1`, [kid]).catch(() => [])

        const generatedData = {
          kid_name: kid, record_type, period: `${period_start || 'Start'} to ${period_end || 'Current'}`,
          elar_summary: {
            skills: elarProgress.map((s: any) => ({ skill_id: s.skill_id, skill_name: s.skill_name, mastery: s.current_mastery })),
            strengths: elarProgress.filter((s: any) => s.current_mastery >= 70).map((s: any) => s.skill_name),
            areas_for_growth: elarProgress.filter((s: any) => s.current_mastery < 50).map((s: any) => s.skill_name),
          },
          math_summary: {
            skills: mathProgress.map((s: any) => ({ skill_id: s.skill_id, skill_name: s.skill_name, mastery: s.current_mastery })),
            strengths: mathProgress.filter((s: any) => s.current_mastery >= 70).map((s: any) => s.skill_name),
            areas_for_growth: mathProgress.filter((s: any) => s.current_mastery < 50).map((s: any) => s.skill_name),
          },
          parent_notes: parent_notes || null,
        }

        const result = await db.query(
          `INSERT INTO academic_records (kid_name, record_type, subject, period_start_date, period_end_date, generated_data, parent_notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [kid, record_type, subject || null, period_start || null, period_end || null, JSON.stringify(generatedData), parent_notes || null]
        )

        return NextResponse.json({ success: true, record_id: result[0]?.id, generated_data: generatedData })
      }

      // ── VOCAB-MIX-1 POST ──
      case 'create_vocab_mix': {
        const { kid_name, book_ids, word_count } = body
        if (!kid_name || !book_ids) return NextResponse.json({ error: 'kid_name, book_ids required' }, { status: 400 })
        const rows = await db.query(
          `INSERT INTO vocab_mixer_sessions (kid_name, book_ids, word_count)
           VALUES ($1, $2, $3) RETURNING *`,
          [kid_name, JSON.stringify(book_ids), word_count || 15]
        )
        return NextResponse.json({ success: true, session: rows[0] })
      }

      case 'generate_vocab_quiz': {
        const { session_id } = body
        if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 })
        const session = await db.query(`SELECT * FROM vocab_mixer_sessions WHERE id = $1`, [session_id])
        if (!session[0]) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

        const kidName = session[0].kid_name
        const words = await db.query(
          `SELECT word, definition FROM kid_vocab_words WHERE kid_name = $1 ORDER BY RANDOM() LIMIT $2`,
          [kidName, session[0].word_count || 15]
        ).catch(() => [])

        if (words.length < 5) return NextResponse.json({ error: 'Not enough vocab words. Add more words from reading first.' }, { status: 400 })

        // Generate quiz sections
        const shuffled = words.sort(() => Math.random() - 0.5)
        const unscramble = shuffled.slice(0, 5).map((w: any) => ({
          scrambled: w.word.split('').sort(() => Math.random() - 0.5).join(''),
          answer: w.word, definition: w.definition,
        }))
        const spotError = shuffled.slice(5, 10).map((w: any) => ({
          word: w.word, definition: w.definition,
          sentence: `The ${w.word} was very important for the project.`,
        }))
        const useInSentence = shuffled.slice(0, 3).map((w: any) => ({
          word: w.word, definition: w.definition,
        }))
        const matchIt = shuffled.slice(0, Math.min(8, shuffled.length)).map((w: any) => ({
          word: w.word, definition: w.definition,
        }))

        const quizData = { unscramble, spotError, useInSentence, matchIt }
        const maxScore = 5 + 5 + 3 + 8 // 21 points
        const quiz = await db.query(
          `INSERT INTO vocab_quizzes (session_id, quiz_data, max_score) VALUES ($1, $2, $3) RETURNING *`,
          [session_id, JSON.stringify(quizData), maxScore]
        )
        return NextResponse.json({ success: true, quiz: quiz[0] })
      }

      case 'submit_vocab_quiz': {
        const { quiz_id, score } = body
        if (!quiz_id) return NextResponse.json({ error: 'quiz_id required' }, { status: 400 })
        await db.query(
          `UPDATE vocab_quizzes SET score = $1, completed_at = NOW() WHERE id = $2`,
          [score || 0, quiz_id]
        )
        return NextResponse.json({ success: true })
      }

      // ── WORKBOOK-1 POST ──
      case 'add_workbook': {
        const { kid_name, workbook_name } = body
        if (!kid_name || !workbook_name) return NextResponse.json({ error: 'kid_name, workbook_name required' }, { status: 400 })
        return NextResponse.json({ success: true, workbook_name })
      }

      case 'log_workbook_page': {
        const { kid_name, workbook_name, page_number, skill_tags, notes } = body
        if (!kid_name || !workbook_name || !page_number) return NextResponse.json({ error: 'kid_name, workbook_name, page_number required' }, { status: 400 })
        const rows = await db.query(
          `INSERT INTO kid_workbook_progress (kid_name, workbook_name, page_number, skill_tags, completed, completed_at, notes)
           VALUES ($1, $2, $3, $4, TRUE, NOW(), $5)
           ON CONFLICT (kid_name, workbook_name, page_number) DO UPDATE SET
             skill_tags = EXCLUDED.skill_tags, completed = TRUE, completed_at = NOW(), notes = EXCLUDED.notes
           RETURNING *`,
          [kid_name, workbook_name, page_number, JSON.stringify(skill_tags || []), notes || null]
        )
        return NextResponse.json({ success: true, entry: rows[0] })
      }

      case 'bulk_map_skills': {
        const { workbook_name, page_range, skill_tags, description } = body
        if (!workbook_name || !page_range || !skill_tags) return NextResponse.json({ error: 'workbook_name, page_range, skill_tags required' }, { status: 400 })
        await db.query(
          `INSERT INTO workbook_skill_map (workbook_name, page_range, skill_tags, description)
           VALUES ($1, $2, $3, $4)`,
          [workbook_name, page_range, JSON.stringify(skill_tags), description || null]
        )
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Learning engine POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
