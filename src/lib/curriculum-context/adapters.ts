import 'server-only'
import { db } from '@/lib/database'

export interface AdapterResult<T> {
  data: T
  confidence: 'high' | 'medium' | 'low' | 'none'
  source: string
}

// Timeout wrapper — individual adapter calls cap at 200ms
async function withTimeout<T>(promise: Promise<T>, ms = 200, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ])
}

// ─── About Me: interests, strengths, struggles ──────────────────────────────
export async function getKidAboutMe(kid: string): Promise<AdapterResult<{
  interests: string[]; strengths: string[]; struggles: string[]
}>> {
  const empty = { interests: [], strengths: [], struggles: [] }
  try {
    const rows = await withTimeout(
      db.query(
        `SELECT interests, strengths, struggles, favorite_subjects, hobbies
         FROM about_me WHERE LOWER(kid_name) = $1 LIMIT 1`,
        [kid.toLowerCase()]
      ),
      200, []
    )
    if (rows.length === 0) return { data: empty, confidence: 'none', source: 'about_me' }
    const r = rows[0]
    const interests = [
      ...(Array.isArray(r.interests) ? r.interests : []),
      ...(Array.isArray(r.hobbies) ? r.hobbies : []),
      ...(Array.isArray(r.favorite_subjects) ? r.favorite_subjects : []),
    ].filter(Boolean)
    return {
      data: {
        interests,
        strengths: Array.isArray(r.strengths) ? r.strengths : [],
        struggles: Array.isArray(r.struggles) ? r.struggles : [],
      },
      confidence: interests.length > 0 ? 'high' : 'low',
      source: 'about_me',
    }
  } catch { return { data: empty, confidence: 'none', source: 'about_me' } }
}

// ─── IEP Goals + Accommodations ─────────────────────────────────────────────
export async function getKidIEPGoals(kid: string): Promise<AdapterResult<{
  goals: Array<{ goal_text: string; area: string; status: string }>
  accommodations: string[]
}>> {
  const empty = { goals: [], accommodations: [] }
  try {
    const goals = await withTimeout(
      db.query(
        `SELECT goal_text, goal_area AS area, status FROM iep_goal_progress
         WHERE LOWER(kid_name) = $1 ORDER BY created_at DESC LIMIT 10`,
        [kid.toLowerCase()]
      ),
      200, []
    )
    const accoms = await withTimeout(
      db.query(
        `SELECT accommodation_text FROM kid_accommodations
         WHERE LOWER(kid_name) = $1 AND active = TRUE`,
        [kid.toLowerCase()]
      ),
      200, []
    )
    return {
      data: {
        goals: goals.map((g: any) => ({ goal_text: g.goal_text || '', area: g.area || '', status: g.status || '' })),
        accommodations: accoms.map((a: any) => a.accommodation_text || ''),
      },
      confidence: goals.length > 0 ? 'high' : 'none',
      source: 'iep_goals + kid_accommodations',
    }
  } catch { return { data: empty, confidence: 'none', source: 'iep_goals' } }
}

// ─── Reading Level from BookBuddy / ELAR progress ───────────────────────────
export async function getKidReadingLevel(kid: string): Promise<AdapterResult<{
  gradeLevel: string; lexile: number | null
}>> {
  const empty = { gradeLevel: '', lexile: null }
  try {
    const rows = await withTimeout(
      db.query(
        `SELECT current_level, skill_name FROM kid_elar_progress
         WHERE LOWER(kid_name) = $1 ORDER BY updated_at DESC LIMIT 1`,
        [kid.toLowerCase()]
      ),
      200, []
    )
    if (rows.length === 0) return { data: empty, confidence: 'none', source: 'kid_elar_progress' }
    return {
      data: { gradeLevel: rows[0].current_level || '', lexile: null },
      confidence: 'medium',
      source: 'kid_elar_progress',
    }
  } catch { return { data: empty, confidence: 'none', source: 'kid_elar_progress' } }
}

// ─── Math Level from MathBuddy ──────────────────────────────────────────────
export async function getKidMathLevel(kid: string): Promise<AdapterResult<{
  currentSkill: string; level: number | null
}>> {
  const empty = { currentSkill: '', level: null }
  try {
    const rows = await withTimeout(
      db.query(
        `SELECT skill_name, current_level FROM kid_math_progress
         WHERE LOWER(kid_name) = $1 ORDER BY updated_at DESC LIMIT 1`,
        [kid.toLowerCase()]
      ),
      200, []
    )
    if (rows.length === 0) return { data: empty, confidence: 'none', source: 'kid_math_progress' }
    return {
      data: { currentSkill: rows[0].skill_name || '', level: rows[0].current_level },
      confidence: 'medium',
      source: 'kid_math_progress',
    }
  } catch { return { data: empty, confidence: 'none', source: 'kid_math_progress' } }
}

// ─── Subject History (last 2 years of units) ────────────────────────────────
export async function getKidSubjectHistory(kid: string, subject: string): Promise<AdapterResult<{
  pastUnits: Array<{ title: string; month: string; year: string }>
}>> {
  try {
    const rows = await withTimeout(
      db.query(
        `SELECT unit_title, month, school_year FROM curriculum_year_outline
         WHERE LOWER(kid_name) = $1 AND subject = $2
         ORDER BY school_year DESC, month LIMIT 20`,
        [kid.toLowerCase(), subject]
      ),
      200, []
    )
    return {
      data: { pastUnits: rows.map((r: any) => ({ title: r.unit_title, month: r.month, year: r.school_year })) },
      confidence: rows.length > 0 ? 'high' : 'none',
      source: 'curriculum_year_outline',
    }
  } catch { return { data: { pastUnits: [] }, confidence: 'none', source: 'curriculum_year_outline' } }
}

// ─── Portfolio Highlights ───────────────────────────────────────────────────
export async function getKidPortfolioHighlights(kid: string): Promise<AdapterResult<{
  items: Array<{ title: string; type: string; subject: string }>
}>> {
  try {
    const rows = await withTimeout(
      db.query(
        `SELECT title, item_type, subject FROM kid_portfolio_items
         WHERE LOWER(kid_name) = $1 ORDER BY created_at DESC LIMIT 5`,
        [kid.toLowerCase()]
      ),
      200, []
    )
    return {
      data: { items: rows.map((r: any) => ({ title: r.title || '', type: r.item_type || '', subject: r.subject || '' })) },
      confidence: rows.length > 0 ? 'medium' : 'none',
      source: 'kid_portfolio_items',
    }
  } catch { return { data: { items: [] }, confidence: 'none', source: 'kid_portfolio_items' } }
}

// ─── Family Library Matches by topic ────────────────────────────────────────
export async function getFamilyLibraryMatches(topics: string[]): Promise<AdapterResult<{
  assets: Array<{ id: string; name: string; type: string; topics: string[] }>
}>> {
  if (topics.length === 0) return { data: { assets: [] }, confidence: 'none', source: 'family_assets' }
  try {
    // Search assets where topic_tags overlap with provided topics
    const rows = await withTimeout(
      db.query(
        `SELECT id, asset_name, asset_type, topic_tags
         FROM family_assets
         WHERE status IN ('in_use', 'storage')
           AND topic_tags && $1
         ORDER BY asset_name LIMIT 20`,
        [topics.map(t => t.toLowerCase())]
      ),
      200, []
    )
    return {
      data: { assets: rows.map((r: any) => ({ id: r.id, name: r.asset_name, type: r.asset_type, topics: r.topic_tags || [] })) },
      confidence: rows.length > 0 ? 'high' : 'none',
      source: 'family_assets',
    }
  } catch { return { data: { assets: [] }, confidence: 'none', source: 'family_assets' } }
}
