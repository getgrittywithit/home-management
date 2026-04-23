import 'server-only'
import { db } from '@/lib/database'
import {
  getKidAboutMe, getKidIEPGoals, getKidReadingLevel, getKidMathLevel,
  getKidSubjectHistory, getKidPortfolioHighlights, getFamilyLibraryMatches,
} from './adapters'

// ─── Pedagogy weight adapter ────────────────────────────────────────────────
const PEDAGOGY_KEY_MAP: Record<string, string> = {
  'montessori': 'montessori_weight', 'waldorf': 'waldorf_weight',
  'charlotte mason': 'charlotte_mason_weight', 'unschool': 'unschool_weight',
  'classical': 'classical_weight', 'hands-on': 'hands_on_weight',
  'literature-based': 'literature_based_weight',
}

async function getPedagogyWeights(): Promise<Record<string, number>> {
  const defaults: Record<string, number> = {
    montessori_weight: 25, waldorf_weight: 20, charlotte_mason_weight: 30,
    unschool_weight: 10, classical_weight: 5, hands_on_weight: 70, literature_based_weight: 60,
  }
  try {
    const rows = await db.query(
      `SELECT montessori_weight, waldorf_weight, charlotte_mason_weight, unschool_weight,
              classical_weight, hands_on_weight, literature_based_weight
       FROM curriculum_pedagogy_preferences WHERE parent_name = 'lola' LIMIT 1`
    )
    return rows.length > 0 ? rows[0] : defaults
  } catch { return defaults }
}

export interface UnitSuggestion {
  unit_title: string
  description: string
  pedagogy_tags: string[]
  objectives: string[]
  matched_assets: Array<{ id: string; name: string; type: string }>
  rationale: string
  confidence: 'high' | 'medium' | 'low'
}

export interface PurchaseSuggestion {
  item_name: string
  tefa_category: string
  estimated_cost_tier: '$' | '$$' | '$$$'
  rationale: string
  priority: 'high' | 'medium' | 'low'
}

// ─── Unit Suggestion Engine ─────────────────────────────────────────────────
export async function suggestUnits(kidName: string, month: string, subject: string): Promise<UnitSuggestion[]> {
  // Pull all context in parallel (each adapter has 200ms timeout)
  const [aboutMe, iep, reading, math, history, portfolio, pedWeights] = await Promise.all([
    getKidAboutMe(kidName),
    getKidIEPGoals(kidName),
    getKidReadingLevel(kidName),
    getKidMathLevel(kidName),
    getKidSubjectHistory(kidName, subject),
    getKidPortfolioHighlights(kidName),
    getPedagogyWeights(),
  ])

  const interests = aboutMe.data.interests
  const strengths = aboutMe.data.strengths
  const pastTitles = new Set(history.data.pastUnits.map(u => u.title.toLowerCase()))

  // Build candidate pool based on subject + interests
  const candidates = generateCandidates(subject, interests, month)

  // Filter out exact repeats
  const filtered = candidates.filter(c => !pastTitles.has(c.title.toLowerCase()))

  // Score each candidate
  const scored = filtered.map(c => {
    let score = c.baseScore
    // Interest match boost
    const interestOverlap = c.topics.filter(t => interests.some(i => i.toLowerCase().includes(t.toLowerCase()))).length
    score += interestOverlap * 15
    // IEP alignment boost
    if (iep.confidence !== 'none') {
      const goalMatch = iep.data.goals.some(g =>
        c.topics.some(t => g.goal_text.toLowerCase().includes(t.toLowerCase()))
      )
      if (goalMatch) score += 20
    }
    // Pedagogy weight boost — weighted by Lola's philosophy slider values
    for (const tag of c.pedagogy) {
      const key = PEDAGOGY_KEY_MAP[tag.toLowerCase()]
      if (key && pedWeights[key] !== undefined) {
        score += (Number(pedWeights[key]) / 100) * 10 // max +10 per matching tag
      }
    }
    // Novelty (not repeated) already filtered above
    return { ...c, score }
  })

  // Sort by score descending, take top 3
  scored.sort((a, b) => b.score - a.score)
  const top3 = scored.slice(0, 3)

  // For each top candidate, find matching assets
  const results: UnitSuggestion[] = []
  for (const c of top3) {
    const libraryMatch = await getFamilyLibraryMatches(c.topics)
    const objectives = buildObjectives(c, iep, reading, math, subject)

    // Abstract IEP-driven rationale (no raw medical text)
    const kidDisplay = kidName.charAt(0).toUpperCase() + kidName.slice(1).toLowerCase()
    let rationale = `Aligns with ${kidDisplay}'s interests`
    if (interestOverlapCount(c.topics, interests) > 0) {
      rationale += ` (${c.topics.filter(t => interests.some(i => i.toLowerCase().includes(t.toLowerCase()))).join(', ')})`
    }
    if (libraryMatch.data.assets.length > 0) {
      rationale += `. You already own ${libraryMatch.data.assets.length} related resource${libraryMatch.data.assets.length > 1 ? 's' : ''}`
    }

    results.push({
      unit_title: c.title,
      description: c.description,
      pedagogy_tags: c.pedagogy,
      objectives,
      matched_assets: libraryMatch.data.assets.map(a => ({ id: a.id, name: a.name, type: a.type })),
      rationale,
      confidence: c.score > 50 ? 'high' : c.score > 25 ? 'medium' : 'low',
    })
  }

  return results
}

// ─── Purchase Suggestion Engine ─────────────────────────────────────────────
export async function suggestPurchases(kidName: string, outlineId?: string): Promise<PurchaseSuggestion[]> {
  const [aboutMe, iep] = await Promise.all([
    getKidAboutMe(kidName),
    getKidIEPGoals(kidName),
  ])

  const suggestions: PurchaseSuggestion[] = []

  // IEP-driven suggestions (highest priority)
  if (iep.confidence !== 'none') {
    for (const goal of iep.data.goals.slice(0, 2)) {
      const area = goal.area?.toLowerCase() || ''
      if (area.includes('speech')) {
        suggestions.push({
          item_name: 'Speech therapy materials or sessions',
          tefa_category: 'Speech Therapy',
          estimated_cost_tier: '$$$',
          rationale: `Supports ${kidName}'s learning profile in speech and language development.`,
          priority: 'high',
        })
      }
      if (area.includes('reading') || area.includes('literacy')) {
        suggestions.push({
          item_name: 'High-interest, leveled readers',
          tefa_category: 'Fiction',
          estimated_cost_tier: '$',
          rationale: `Age-appropriate reading material matched to ${kidName}'s current level.`,
          priority: 'high',
        })
      }
      if (area.includes('math') || area.includes('number')) {
        suggestions.push({
          item_name: 'Math manipulatives (fraction tiles, base-10 blocks)',
          tefa_category: 'Learning Manipulatives',
          estimated_cost_tier: '$$',
          rationale: `Hands-on math tools to support ${kidName}'s skill building.`,
          priority: 'high',
        })
      }
    }
  }

  // Interest-driven suggestions
  const interests = aboutMe.data.interests
  if (interests.some(i => /animal|nature|science|ocean|plant/i.test(i))) {
    suggestions.push({
      item_name: 'Nature study field guide or STEM kit',
      tefa_category: 'STEM Kits',
      estimated_cost_tier: '$$',
      rationale: `Matches ${kidName}'s love of nature and science exploration.`,
      priority: 'medium',
    })
  }
  if (interests.some(i => /art|draw|paint|creative/i.test(i))) {
    suggestions.push({
      item_name: 'Art supply refill kit',
      tefa_category: 'Art Supplies',
      estimated_cost_tier: '$',
      rationale: `Feeds ${kidName}'s creative side.`,
      priority: 'medium',
    })
  }
  if (interests.some(i => /music|instrument|guitar|piano/i.test(i))) {
    suggestions.push({
      item_name: 'Instrument accessories or lesson sessions',
      tefa_category: 'Instrument Accessories',
      estimated_cost_tier: '$$',
      rationale: `Supports ${kidName}'s interest in music.`,
      priority: 'medium',
    })
  }

  // General coverage suggestions
  suggestions.push({
    item_name: 'Subscription: IXL or similar adaptive learning',
    tefa_category: 'Online Learning Program',
    estimated_cost_tier: '$$',
    rationale: `Adaptive practice for ${kidName} across multiple subjects.`,
    priority: 'low',
  })

  // Deduplicate by category
  const seen = new Set<string>()
  const deduped = suggestions.filter(s => {
    if (seen.has(s.tefa_category)) return false
    seen.add(s.tefa_category)
    return true
  })

  return deduped.slice(0, 5)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function interestOverlapCount(topics: string[], interests: string[]): number {
  return topics.filter(t => interests.some(i => i.toLowerCase().includes(t.toLowerCase()))).length
}

interface Candidate {
  title: string
  description: string
  topics: string[]
  pedagogy: string[]
  baseScore: number
}

function generateCandidates(subject: string, interests: string[], month: string): Candidate[] {
  // Subject-specific template pools
  const pools: Record<string, Candidate[]> = {
    'Science': [
      { title: 'Ocean Ecosystems', description: 'Explore marine biomes, food webs, and ocean conservation.', topics: ['ocean', 'marine', 'animals', 'ecosystem'], pedagogy: ['Hands-on', 'Charlotte Mason'], baseScore: 30 },
      { title: 'Weather & Climate', description: 'Understand weather patterns, water cycle, and climate zones.', topics: ['weather', 'climate', 'water', 'nature'], pedagogy: ['Hands-on', 'Montessori'], baseScore: 30 },
      { title: 'Human Body Systems', description: 'Explore the skeletal, muscular, digestive, and circulatory systems.', topics: ['body', 'health', 'anatomy'], pedagogy: ['Hands-on', 'Classical'], baseScore: 25 },
      { title: 'Plants & Botany', description: 'Plant life cycles, photosynthesis, gardening project.', topics: ['plants', 'garden', 'nature', 'botany'], pedagogy: ['Montessori', 'Charlotte Mason'], baseScore: 30 },
      { title: 'Space & Astronomy', description: 'Solar system, constellations, moon phases, space exploration.', topics: ['space', 'astronomy', 'planets', 'stars'], pedagogy: ['Charlotte Mason', 'Classical'], baseScore: 28 },
      { title: 'Simple Machines & Engineering', description: 'Levers, pulleys, inclined planes — build and test.', topics: ['engineering', 'machines', 'building', 'construction'], pedagogy: ['Hands-on', 'Montessori'], baseScore: 25 },
      { title: 'Insects & Entomology', description: 'Insect anatomy, life cycles, backyard observation.', topics: ['insects', 'bugs', 'nature', 'animals'], pedagogy: ['Charlotte Mason', 'Hands-on'], baseScore: 22 },
      { title: 'Rocks, Minerals & Geology', description: 'Rock types, crystal growing, fossil exploration.', topics: ['rocks', 'geology', 'earth', 'fossils'], pedagogy: ['Hands-on', 'Montessori'], baseScore: 22 },
    ],
    'ELAR': [
      { title: 'Narrative Writing Workshop', description: 'Story structure, character development, personal narratives.', topics: ['writing', 'stories', 'creativity'], pedagogy: ['Charlotte Mason', 'Classical'], baseScore: 28 },
      { title: 'Poetry & Verse Study', description: 'Read, analyze, and write various forms of poetry.', topics: ['poetry', 'writing', 'literature'], pedagogy: ['Charlotte Mason', 'Waldorf'], baseScore: 25 },
      { title: 'Read-Aloud Novel Study', description: 'Deep dive into a chapter book with discussion and comprehension.', topics: ['reading', 'books', 'literature'], pedagogy: ['Charlotte Mason', 'Literature-based'], baseScore: 30 },
      { title: 'Nonfiction Research Project', description: 'Choose a topic, research it, write and present findings.', topics: ['research', 'nonfiction', 'writing'], pedagogy: ['Classical', 'Hands-on'], baseScore: 25 },
      { title: 'Vocabulary Through Literature', description: 'Build vocabulary from current read-aloud using context clues.', topics: ['vocabulary', 'reading', 'words'], pedagogy: ['Charlotte Mason', 'Literature-based'], baseScore: 28 },
    ],
    'Math': [
      { title: 'Fractions & Decimals', description: 'Hands-on fraction exploration with manipulatives and real-world problems.', topics: ['fractions', 'math', 'numbers'], pedagogy: ['Montessori', 'Hands-on'], baseScore: 28 },
      { title: 'Measurement & Data', description: 'Measuring length, weight, capacity; collecting and graphing data.', topics: ['measurement', 'data', 'graphing'], pedagogy: ['Montessori', 'Hands-on'], baseScore: 25 },
      { title: 'Geometry & Shapes', description: 'Identify shapes, angles, area, perimeter with building projects.', topics: ['geometry', 'shapes', 'building'], pedagogy: ['Montessori', 'Hands-on'], baseScore: 25 },
      { title: 'Money & Financial Literacy', description: 'Counting money, making change, budgeting basics, real-world math.', topics: ['money', 'finance', 'math'], pedagogy: ['Montessori', 'Unschool'], baseScore: 28 },
      { title: 'Multiplication Mastery', description: 'Fact fluency through games, songs, and timed practice.', topics: ['multiplication', 'math', 'facts'], pedagogy: ['Hands-on', 'Classical'], baseScore: 22 },
    ],
    'Social Studies': [
      { title: 'Texas History', description: 'From Native peoples to the Republic to statehood.', topics: ['texas', 'history', 'state'], pedagogy: ['Charlotte Mason', 'Literature-based'], baseScore: 30 },
      { title: 'World Cultures', description: 'Explore geography, food, traditions, and daily life around the world.', topics: ['geography', 'cultures', 'world', 'food'], pedagogy: ['Charlotte Mason', 'Montessori'], baseScore: 28 },
      { title: 'Community & Government', description: 'How local government works, community helpers, civic responsibility.', topics: ['government', 'community', 'civic'], pedagogy: ['Classical', 'Charlotte Mason'], baseScore: 22 },
      { title: 'Map Skills & Geography', description: 'Continents, oceans, map reading, globe exploration.', topics: ['geography', 'maps', 'world'], pedagogy: ['Montessori', 'Hands-on'], baseScore: 25 },
    ],
    'Art': [
      { title: 'Nature Art & Observation', description: 'Nature journaling, pressed flowers, outdoor sketching.', topics: ['art', 'nature', 'drawing'], pedagogy: ['Charlotte Mason', 'Waldorf'], baseScore: 28 },
      { title: 'Famous Artists Study', description: 'Study one artist per week, recreate their style.', topics: ['art', 'painting', 'creativity'], pedagogy: ['Charlotte Mason', 'Classical'], baseScore: 25 },
    ],
    'Music': [
      { title: 'Instrument Exploration', description: 'Try different instruments, learn basic music theory.', topics: ['music', 'instrument', 'rhythm'], pedagogy: ['Waldorf', 'Hands-on'], baseScore: 25 },
      { title: 'Composers Study', description: 'Listen to and learn about major composers across eras.', topics: ['music', 'composers', 'classical'], pedagogy: ['Charlotte Mason', 'Classical'], baseScore: 22 },
    ],
    'Enrichment': [
      { title: 'Cooking & Kitchen Science', description: 'Recipes, measurement, food science, nutrition.', topics: ['cooking', 'food', 'science', 'recipe'], pedagogy: ['Montessori', 'Hands-on'], baseScore: 28 },
      { title: 'Gardening Project', description: 'Plan, plant, tend, and harvest a small garden.', topics: ['garden', 'plants', 'nature', 'outdoors'], pedagogy: ['Montessori', 'Waldorf'], baseScore: 28 },
    ],
    'Life Skills': [
      { title: 'Personal Finance Basics', description: 'Saving, spending, earning, budgeting for kids.', topics: ['money', 'finance', 'budgeting'], pedagogy: ['Montessori', 'Unschool'], baseScore: 25 },
      { title: 'Home Skills Workshop', description: 'Laundry, cooking, cleaning, basic repairs.', topics: ['home', 'cooking', 'cleaning', 'skills'], pedagogy: ['Montessori', 'Hands-on'], baseScore: 25 },
    ],
    'PE': [
      { title: 'Outdoor Adventure Month', description: 'Hiking, nature walks, swimming, backyard games.', topics: ['outdoors', 'exercise', 'nature', 'sports'], pedagogy: ['Waldorf', 'Hands-on'], baseScore: 25 },
      { title: 'Team Sports Basics', description: 'Soccer, basketball, baseball fundamentals and sportsmanship.', topics: ['sports', 'teamwork', 'exercise'], pedagogy: ['Hands-on'], baseScore: 22 },
    ],
  }

  return pools[subject] || pools['Enrichment'] || []
}

function buildObjectives(
  candidate: Candidate,
  iep: Awaited<ReturnType<typeof getKidIEPGoals>>,
  reading: Awaited<ReturnType<typeof getKidReadingLevel>>,
  math: Awaited<ReturnType<typeof getKidMathLevel>>,
  subject: string,
): string[] {
  const objectives: string[] = []

  // Topic-based objectives
  if (candidate.topics.length > 0) {
    objectives.push(`Explore key concepts in ${candidate.topics.slice(0, 2).join(' and ')}`)
  }

  // Pedagogy-based
  if (candidate.pedagogy.includes('Charlotte Mason')) {
    objectives.push('Keep a nature journal or narration journal throughout the unit')
  }
  if (candidate.pedagogy.includes('Hands-on')) {
    objectives.push('Complete at least one hands-on project or experiment')
  }
  if (candidate.pedagogy.includes('Montessori')) {
    objectives.push('Self-directed exploration with guided materials')
  }

  // IEP-informed (abstracted — no raw goal text)
  if (iep.confidence !== 'none' && iep.data.goals.length > 0) {
    objectives.push('Practice skills aligned with learning profile goals')
  }

  // Level-aware
  if (subject === 'ELAR' && reading.confidence !== 'none' && reading.data.gradeLevel) {
    objectives.push(`Read at or slightly above current level (${reading.data.gradeLevel})`)
  }
  if (subject === 'Math' && math.confidence !== 'none' && math.data.currentSkill) {
    objectives.push(`Build on current skill: ${math.data.currentSkill}`)
  }

  return objectives.slice(0, 5)
}
