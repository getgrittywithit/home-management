import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import crypto from 'crypto'

// ============================================================================
// Recipe Import Pipeline — Dispatch 68b RECIPE-1 + RECIPE-2
// Accepts PDF uploads (base64), passes each directly to Claude Sonnet 4
// for parsing (Claude's native document vision handles OCR internally),
// stores results in recipe_import_staging for parent review, then moves
// approved items into meal_library.
// ============================================================================

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'
const MAX_BATCH_SIZE = 50
const MAX_PDF_BYTES = 8 * 1024 * 1024 // 8MB per file
// https://docs.anthropic.com/en/docs/build-with-claude/pdf-support

const PARSE_PROMPT = `You are parsing a scanned paper recipe (OCR/vision input). Return a single JSON object with EXACTLY these fields — no prose, no markdown, just JSON:

{
  "name": "Recipe name",
  "meal_type": "dinner",              // one of: breakfast, lunch, dinner, side, dessert, drink, snack, sauce
  "theme_match": "american",          // one of: american, asian, mexican, italian, soup, grill, comfort, brunch, experiment, none
  "season": "year-round",             // one of: spring-summer, fall-winter, year-round
  "difficulty": "medium",             // easy, medium, hard
  "prep_time_min": 15,                // integer minutes, null if unknown
  "cook_time_min": 20,                // integer minutes, null if unknown
  "servings": 6,                      // integer, null if unknown
  "description": "One short hook sentence.",
  "ingredients": [
    { "item": "chicken breast", "amount": "2 lbs", "notes": "diced" }
  ],
  "instructions": ["Step 1...", "Step 2..."],
  "sides_starch_options": [],         // suggested starch sides (empty for non-dinner)
  "sides_veggie_options": [],         // suggested veggie/salad sides
  "dietary_notes": [],                // dairy-free, gluten-free, contains-mushrooms, etc.
  "has_mushrooms": false,             // CRITICAL: set TRUE if ANY ingredient contains mushrooms
  "kid_manager_fit": null,            // kaylee (under 30 min, 0-1 pan) | amos | zoey | ellie_hannah | parents | null
  "source": "handwritten",            // handwritten | printed | magazine_clipping | internet_printout
  "confidence": 0.85                  // 0.0-1.0 — how confident you are in the parse
}

RULES:
- If the document doesn't look like a recipe (shopping list, note, blank page), set name to "NOT A RECIPE" and confidence 0.
- Flag has_mushrooms TRUE for any mushroom ingredient — this is a hard family "no".
- Kid-manager fit: tag "kaylee" only for recipes under 30 min total with 0-1 pans and simple steps.
- Confidence < 0.6 means the parse should be flagged for parent review.
- Return ONLY the JSON object. No surrounding text, no markdown code fences.`

interface ParsedRecipe {
  name: string
  meal_type: string
  theme_match: string
  season: string
  difficulty: string
  prep_time_min: number | null
  cook_time_min: number | null
  servings: number | null
  description: string
  ingredients: { item: string; amount?: string; notes?: string }[]
  instructions: string[]
  sides_starch_options: string[]
  sides_veggie_options: string[]
  dietary_notes: string[]
  has_mushrooms: boolean
  kid_manager_fit: string | null
  source: string
  confidence: number
}

async function callClaudeForPdf(apiKey: string, pdfBase64: string): Promise<ParsedRecipe | null> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
            { type: 'text', text: PARSE_PROMPT },
          ],
        },
      ],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('Claude parse failed:', res.status, err)
    throw new Error(`Claude parse failed: ${res.status}`)
  }
  const data = await res.json()
  const text = data.content?.[0]?.text || ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    return JSON.parse(jsonMatch[0]) as ParsedRecipe
  } catch {
    return null
  }
}

// ----------------------------------------------------------------------------
// GET
// ----------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'list_batches'

  try {
    if (action === 'list_batches') {
      const rows = await db.query(
        `SELECT batch_id,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'parsed')::int AS ready,
                COUNT(*) FILTER (WHERE status = 'needs_review')::int AS review,
                COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
                COUNT(*) FILTER (WHERE status = 'imported')::int AS imported,
                COUNT(*) FILTER (WHERE status = 'skipped')::int AS skipped,
                MAX(created_at) AS created_at
         FROM recipe_import_staging
         GROUP BY batch_id
         ORDER BY created_at DESC`
      )
      return NextResponse.json({ batches: rows })
    }

    if (action === 'list_batch') {
      const batchId = searchParams.get('batch_id')
      if (!batchId) return NextResponse.json({ error: 'batch_id required' }, { status: 400 })
      const rows = await db.query(
        `SELECT id, batch_id, original_filename, file_size_bytes, parsed_data,
                status, error_message, confidence, imported_meal_id, created_at
         FROM recipe_import_staging
         WHERE batch_id = $1
         ORDER BY created_at`,
        [batchId]
      )
      return NextResponse.json({ items: rows })
    }

    if (action === 'get_item') {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      const rows = await db.query(`SELECT * FROM recipe_import_staging WHERE id = $1`, [id])
      if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
      return NextResponse.json({ item: rows[0] })
    }

    return NextResponse.json({ error: `Unknown GET action: ${action}` }, { status: 400 })
  } catch (err) {
    console.error('recipe-import GET error:', err)
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}

// ----------------------------------------------------------------------------
// POST
// ----------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const { action, ...data } = body

  try {
    switch (action) {
      // ----------------------------------------------------------------
      // upload_batch — insert staging rows for a fresh batch
      // ----------------------------------------------------------------
      case 'upload_batch': {
        const { files } = data // [{ filename, size, pdf_base64 }]
        if (!Array.isArray(files) || files.length === 0) {
          return NextResponse.json({ error: 'files array required' }, { status: 400 })
        }
        if (files.length > MAX_BATCH_SIZE) {
          return NextResponse.json({ error: `Max ${MAX_BATCH_SIZE} files per batch` }, { status: 400 })
        }

        const batchId = crypto.randomUUID()
        const inserted: any[] = []

        for (const f of files) {
          if (!f.pdf_base64 || !f.filename) continue
          // Crude base64 size estimate: 3/4 * length
          const approxBytes = Math.floor((f.pdf_base64.length * 3) / 4)
          if (approxBytes > MAX_PDF_BYTES) {
            inserted.push({ filename: f.filename, skipped: 'too large' })
            continue
          }
          const rows = await db.query(
            `INSERT INTO recipe_import_staging (batch_id, original_filename, file_size_bytes, pdf_base64, status)
             VALUES ($1, $2, $3, $4, 'uploaded')
             RETURNING id, original_filename, status`,
            [batchId, f.filename, approxBytes, f.pdf_base64]
          )
          inserted.push(rows[0])
        }

        return NextResponse.json({ batch_id: batchId, items: inserted, count: inserted.length }, { status: 201 })
      }

      // ----------------------------------------------------------------
      // parse_batch — iterate staging rows, call Claude per PDF, store result
      // ----------------------------------------------------------------
      case 'parse_batch': {
        const { batch_id } = data
        if (!batch_id) return NextResponse.json({ error: 'batch_id required' }, { status: 400 })

        const apiKey = process.env.ANTHROPIC_API_KEY
        if (!apiKey) {
          return NextResponse.json({
            error: 'Recipe parsing not configured. Add ANTHROPIC_API_KEY to Vercel environment variables.',
          }, { status: 503 })
        }

        const rows = await db.query(
          `SELECT id, original_filename, pdf_base64 FROM recipe_import_staging
           WHERE batch_id = $1 AND status IN ('uploaded','extracted','failed')`,
          [batch_id]
        )

        let parsed = 0, needsReview = 0, failed = 0
        for (const row of rows) {
          try {
            const result = await callClaudeForPdf(apiKey, row.pdf_base64)
            if (!result || !result.name || result.name === 'NOT A RECIPE') {
              await db.query(
                `UPDATE recipe_import_staging
                 SET status = 'failed', error_message = 'Not a recipe or unparseable', updated_at = NOW()
                 WHERE id = $1`,
                [row.id]
              )
              failed++
              continue
            }
            const status = (result.confidence ?? 0) < 0.6 ? 'needs_review' : 'parsed'
            await db.query(
              `UPDATE recipe_import_staging
               SET status = $2, parsed_data = $3, confidence = $4, updated_at = NOW()
               WHERE id = $1`,
              [row.id, status, JSON.stringify(result), result.confidence ?? null]
            )
            if (status === 'parsed') parsed++
            else needsReview++
          } catch (err) {
            await db.query(
              `UPDATE recipe_import_staging
               SET status = 'failed', error_message = $2, updated_at = NOW()
               WHERE id = $1`,
              [row.id, err instanceof Error ? err.message : 'Unknown error']
            )
            failed++
          }
        }

        return NextResponse.json({ parsed, needs_review: needsReview, failed, total: rows.length })
      }

      // ----------------------------------------------------------------
      // update_item — parent edits parsed_data before import
      // ----------------------------------------------------------------
      case 'update_item': {
        const { id, parsed_data } = data
        if (!id || !parsed_data) return NextResponse.json({ error: 'id and parsed_data required' }, { status: 400 })
        const rows = await db.query(
          `UPDATE recipe_import_staging
           SET parsed_data = $2, status = 'parsed', updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [id, JSON.stringify(parsed_data)]
        )
        return NextResponse.json({ item: rows[0] })
      }

      // ----------------------------------------------------------------
      // import_item — move a single parsed recipe to meal_library
      // ----------------------------------------------------------------
      case 'import_item': {
        const { id } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

        const rows = await db.query(
          `SELECT * FROM recipe_import_staging WHERE id = $1 AND status IN ('parsed','needs_review')`,
          [id]
        )
        if (!rows[0]) return NextResponse.json({ error: 'not found or not ready' }, { status: 404 })

        const staging = rows[0]
        const p: ParsedRecipe = staging.parsed_data
        if (!p?.name) return NextResponse.json({ error: 'missing name in parsed data' }, { status: 400 })

        // Insert into meal_library
        const insert = await db.query(
          `INSERT INTO meal_library (
             name, theme, season, description, meal_type, difficulty,
             sides, sides_starch_options, sides_veggie_options,
             ingredients, recipe_steps, prep_time_min, cook_time_min, servings,
             source, kid_manager_fit, dietary_notes, has_mushrooms, active
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,TRUE)
           RETURNING id`,
          [
            p.name,
            p.theme_match === 'none' ? null : p.theme_match,
            p.season || 'year-round',
            p.description || null,
            p.meal_type || 'dinner',
            p.difficulty || null,
            // legacy sides text = first starch/veggie joined for display
            [p.sides_starch_options?.[0], p.sides_veggie_options?.[0]].filter(Boolean).join(' + ') || null,
            p.sides_starch_options || [],
            p.sides_veggie_options || [],
            JSON.stringify(p.ingredients || []),
            JSON.stringify(p.instructions || []),
            p.prep_time_min ?? null,
            p.cook_time_min ?? null,
            p.servings ?? null,
            p.source || 'handwritten',
            p.kid_manager_fit === 'null' ? null : p.kid_manager_fit || null,
            p.dietary_notes || [],
            !!p.has_mushrooms,
          ]
        )

        await db.query(
          `UPDATE recipe_import_staging
           SET status = 'imported', imported_meal_id = $2, updated_at = NOW()
           WHERE id = $1`,
          [id, insert[0].id]
        )

        return NextResponse.json({ ok: true, meal_id: insert[0].id })
      }

      // ----------------------------------------------------------------
      // skip_item — parent rejects a parsed recipe
      // ----------------------------------------------------------------
      case 'skip_item': {
        const { id, reason } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(
          `UPDATE recipe_import_staging SET status = 'skipped', error_message = $2, updated_at = NOW() WHERE id = $1`,
          [id, reason || null]
        )
        return NextResponse.json({ ok: true })
      }

      // ----------------------------------------------------------------
      // delete_batch — remove all staging rows for a batch
      // ----------------------------------------------------------------
      case 'delete_batch': {
        const { batch_id } = data
        if (!batch_id) return NextResponse.json({ error: 'batch_id required' }, { status: 400 })
        await db.query(`DELETE FROM recipe_import_staging WHERE batch_id = $1`, [batch_id])
        return NextResponse.json({ ok: true })
      }

      default:
        return NextResponse.json({ error: `Unknown POST action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    console.error('recipe-import POST error:', err)
    return NextResponse.json({ error: 'Request failed', detail: String(err) }, { status: 500 })
  }
}
