import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

const KID_AGES: Record<string, number> = { amos: 17, zoey: 15, kaylee: 13, ellie: 12, wyatt: 10, hannah: 8 }

function getCurrentQuarter() {
  const m = new Date().getMonth()
  const y = new Date().getFullYear()
  return `${y}-Q${Math.floor(m / 3) + 1}`
}

async function generateGiftIdeas(kidName: string) {
  const kid = kidName.toLowerCase()
  const age = KID_AGES[kid] || 10

  // Gather data from multiple sources
  const vibe = await db.query(`SELECT interests FROM kid_vibe_profile WHERE kid_name = $1`, [kid]).catch(() => [])
  const shop = await db.query(`SELECT sensory_triggers, sizes, notes FROM kid_shopping_profile WHERE kid_name = $1`, [kid]).catch(() => [])
  const achievements = await db.query(
    `SELECT title FROM kid_achievements WHERE kid_name = $1 ORDER BY earned_at DESC LIMIT 5`, [kid]
  ).catch(() => [])

  const parse = (v: any) => { if (!v) return []; if (typeof v === 'string') try { return JSON.parse(v) } catch { return [] } return v }
  const interests = parse(vibe[0]?.interests)
  const triggers = parse(shop[0]?.sensory_triggers)
  const notes = shop[0]?.notes || ''

  // Build heuristic suggestions based on profile data
  const suggestions: any[] = []
  const dataSources = ['kid_vibe_profile', 'kid_shopping_profile']
  if (achievements.length > 0) dataSources.push('kid_achievements')

  // Interest-based suggestions
  const interestGifts: Record<string, any[]> = {
    construction: [
      { name: 'LEGO Architecture Set', description: 'Build real-world landmarks', price_range: '$30-$50', category: 'Educational' },
      { name: 'Tool Belt Kit (Kid/Teen)', description: 'Real tools sized for young hands', price_range: '$25-$40', category: 'Educational' },
    ],
    trades: [
      { name: 'Snap Circuits Electronics Kit', description: 'Build real circuits — no soldering', price_range: '$30-$60', category: 'Educational' },
    ],
    theater: [
      { name: 'Improv Card Game', description: 'Comedy and acting practice with friends', price_range: '$15-$25', category: 'Creative' },
      { name: 'Stage Makeup Kit', description: 'Theater-quality makeup for performances', price_range: '$20-$35', category: 'Creative' },
    ],
    acting: [
      { name: 'Monologue Collection Book', description: 'Age-appropriate monologues for auditions', price_range: '$15-$20', category: 'Books' },
    ],
    geography: [
      { name: 'Scratch-Off World Map', description: 'Scratch off countries as you learn them', price_range: '$20-$30', category: 'Educational' },
      { name: 'National Geographic Atlas', description: 'Detailed maps and cultural info', price_range: '$25-$40', category: 'Books' },
    ],
    astronomy: [
      { name: 'Desktop Planetarium Projector', description: 'Project stars on the ceiling', price_range: '$25-$45', category: 'Tech' },
    ],
    space: [
      { name: 'NASA Space Shuttle Model Kit', description: 'Detailed build-it-yourself model', price_range: '$20-$35', category: 'Educational' },
    ],
    plants: [
      { name: 'Indoor Herb Garden Kit', description: 'Grow basil, mint, and cilantro indoors', price_range: '$20-$30', category: 'Outdoor' },
      { name: 'Succulent Terrarium Kit', description: 'Build a mini ecosystem', price_range: '$15-$25', category: 'Creative' },
    ],
    crafts: [
      { name: 'Jewelry Making Kit', description: 'Beads, wire, tools for handmade jewelry', price_range: '$15-$30', category: 'Creative' },
    ],
    cooking: [
      { name: 'Kids Baking Championship Cookbook', description: 'Recipes from the TV show', price_range: '$15-$20', category: 'Books' },
      { name: 'Personalized Apron', description: 'Custom name embroidered', price_range: '$15-$25', category: 'Clothing' },
    ],
    business: [
      { name: 'Lemonade Stand Business Kit', description: 'Complete startup kit with money math', price_range: '$25-$40', category: 'Educational' },
    ],
    entrepreneurship: [
      { name: '"Kid Start-Up" Book', description: 'Real stories of young entrepreneurs', price_range: '$12-$18', category: 'Books' },
    ],
    Roblox: [
      { name: 'Roblox Gift Card', description: 'Robux for their favorite games', price_range: '$10-$25', category: 'Tech' },
    ],
    Minecraft: [
      { name: 'Minecraft LEGO Set', description: 'Build Minecraft worlds in real life', price_range: '$20-$50', category: 'Educational' },
    ],
    JROTC: [
      { name: 'Tactical Flashlight', description: 'Durable, multi-mode LED flashlight', price_range: '$15-$30', category: 'Outdoor' },
    ],
    outdoors: [
      { name: 'Adventure Journal', description: 'Log outdoor explorations with prompts', price_range: '$12-$18', category: 'Books' },
    ],
  }

  for (const interest of interests) {
    const gifts = interestGifts[interest.toLowerCase()] || interestGifts[interest]
    if (gifts) {
      gifts.forEach(g => suggestions.push({ ...g, why: `Based on interest in ${interest}` }))
    }
  }

  // Universal suggestions based on age
  if (age >= 13) {
    suggestions.push({ name: 'Amazon Gift Card', description: 'Let them choose', price_range: '$15-$50', category: 'Tech', why: 'Teens appreciate choosing their own items' })
  }
  if (age <= 10) {
    suggestions.push({ name: 'Art Supply Kit', description: 'Markers, colored pencils, sketchbook', price_range: '$15-$25', category: 'Creative', why: 'Great for creative expression at this age' })
  }

  // Add sensory warnings
  const accessibilityNotes: string[] = []
  if (triggers.length > 0) accessibilityNotes.push(`Sensory triggers: ${triggers.join(', ')}`)
  if (notes.includes('Color vision deficiency')) accessibilityNotes.push('Color vision deficiency — avoid gifts that require color identification')
  if (notes.includes('Auditory sensitivity')) accessibilityNotes.push('Auditory sensitivity — avoid loud or musical toys')

  return {
    suggestions: suggestions.slice(0, 10),
    accessibility_notes: accessibilityNotes,
    data_sources: dataSources,
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || ''

  try {
    if (action === 'get_suggestions') {
      const kid = searchParams.get('kid_name')
      const quarter = searchParams.get('quarter') || getCurrentQuarter()
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const rows = await db.query(
        `SELECT * FROM ai_gift_suggestions WHERE kid_name = $1 AND quarter = $2 ORDER BY generated_at DESC LIMIT 1`,
        [kid.toLowerCase(), quarter]
      ).catch(() => [])
      return NextResponse.json({ suggestion: rows[0] || null })
    }

    if (action === 'get_all_suggestions') {
      const quarter = searchParams.get('quarter') || getCurrentQuarter()
      const rows = await db.query(
        `SELECT DISTINCT ON (kid_name) * FROM ai_gift_suggestions WHERE quarter = $1 ORDER BY kid_name, generated_at DESC`,
        [quarter]
      ).catch(() => [])
      return NextResponse.json({ suggestions: rows })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Gifts GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'generate_suggestions': {
        const { kid_name, occasion } = body
        if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const kid = kid_name.toLowerCase()
        const quarter = getCurrentQuarter()
        const result = await generateGiftIdeas(kid)

        await db.query(
          `INSERT INTO ai_gift_suggestions (kid_name, quarter, occasion, suggestions, data_sources)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (kid_name, quarter, occasion) DO UPDATE SET
             suggestions = $4, data_sources = $5, generated_at = NOW()`,
          [kid, quarter, occasion || 'general', JSON.stringify(result.suggestions),
           JSON.stringify(result.data_sources)]
        )

        return NextResponse.json({
          success: true,
          suggestions: result.suggestions,
          accessibility_notes: result.accessibility_notes,
        })
      }

      case 'add_note': {
        const { id, parent_notes } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`UPDATE ai_gift_suggestions SET parent_notes = $1 WHERE id = $2`, [parent_notes, id])
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Gifts POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
