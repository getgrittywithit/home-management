// Seed STAAR data from the deep data pull markdown
// Run: node scripts/seed-staar.mjs

import pg from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'

const { Pool } = pg
const pool = new Pool({
  connectionString: (process.env.DATABASE_URL || 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:6543/postgres'),
  ssl: { rejectUnauthorized: false }
})

const KID_MAP = {
  'WYATT MOSES': 'wyatt',
  'AMOS MOSES': 'amos',
  'ZOEY MOSES': 'zoey',
  'ELLIE MOSES': 'ellie',
  'KAYLEE MOSES': 'kaylee',
}

function parseScore(s) { return parseInt(s.replace(/,/g, '')) || 0 }

function parsePerformanceLevel(line) {
  if (line.includes('Masters')) return 'Masters'
  if (line.includes('Meets')) return 'Meets'
  if (line.includes('Approaches')) return 'Approaches'
  if (line.includes('Did Not Meet')) return 'Did Not Meet'
  return 'Unknown'
}

function parseResult(r) {
  if (r.includes('✓') || r.toLowerCase() === 'correct') return 'correct'
  if (r.includes('Partial') || r.toLowerCase() === 'partial') return 'partial'
  return 'incorrect'
}

async function run() {
  const client = await pool.connect()
  try {
    console.log('=== Seeding STAAR Data from Markdown ===\n')

    // Check if already seeded
    const existing = await client.query('SELECT COUNT(*)::int as c FROM staar_results')
    if (existing.rows[0].c > 0) {
      console.log(`Already have ${existing.rows[0].c} STAAR results. Skipping.`)
      return
    }

    const filePath = join(process.cwd(), 'Moses Kids Docs scanned 2026 copy', 'STAAR Detailed Reports — Deep Data Pull (April 2026).md')
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    let currentKid = null
    let currentYear = null
    let currentResult = null
    let parsingCategories = false
    let parsingQuestions = false
    let parsingTrend = false
    let trendType = null
    let categories = []
    let questions = []
    let totalResults = 0
    let totalCategories = 0
    let totalQuestions = 0
    let totalTrends = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Detect kid header (# KIDNAME MOSES or ## KIDNAME MOSES)
      for (const [fullName, kidName] of Object.entries(KID_MAP)) {
        if (line === `# ${fullName}` || line === `## ${fullName}`) {
          currentKid = kidName
          currentYear = null
          break
        }
      }

      // Detect school year
      const yearMatch = line.match(/^## (\d{4}-\d{4}) School Year/)
      if (yearMatch) {
        currentYear = yearMatch[1]
        continue
      }

      // Detect test header (### STAAR ...)
      const testMatch = line.match(/^### (STAAR .+)/)
      if (testMatch && currentKid && currentYear) {
        // Save previous result if exists
        if (currentResult) {
          await saveResult(client, currentResult, categories, questions)
          totalResults++
          totalCategories += categories.length
          totalQuestions += questions.length
        }

        const testName = testMatch[1].replace(/—.*$/, '').trim()

        // Parse subject and grade from test name
        let subject = 'Unknown'
        let gradeTested = 'Unknown'
        const gradeMatch = testName.match(/Grade (\d+)/)
        if (gradeMatch) gradeTested = gradeMatch[1]

        if (testName.includes('Mathematics') || testName.includes('Math')) subject = 'Math'
        else if (testName.includes('Reading Language Arts') || testName.includes('RLA')) subject = 'RLA'
        else if (testName.includes('Reading') && !testName.includes('Language')) subject = 'Reading'
        else if (testName.includes('Science')) subject = 'Science'
        else if (testName.includes('Biology')) { subject = 'Biology'; gradeTested = 'EOC' }
        else if (testName.includes('Algebra')) { subject = 'Algebra I'; gradeTested = 'EOC' }
        else if (testName.includes('English I')) { subject = 'English I'; gradeTested = 'EOC' }

        currentResult = {
          kid_name: currentKid,
          school_year: currentYear,
          test_name: testName,
          subject,
          grade_tested: gradeTested,
          score: 0,
          performance_level: 'Unknown',
          percentile: null,
          lexile_score: null,
          quantile_score: null,
          state_average: null,
          district_average: null,
          campus_average: null,
          school_name: null,
          school_code: null,
          embedded_supports: currentKid === 'kaylee',
        }
        categories = []
        questions = []
        parsingCategories = false
        parsingQuestions = false
        parsingTrend = false
        continue
      }

      if (!currentResult) continue

      // Parse score line
      const scoreLine = line.match(/^\*\*Score:\*\*\s*(\d+)/)
      if (scoreLine) {
        currentResult.score = parseScore(scoreLine[1])
        currentResult.performance_level = parsePerformanceLevel(line)
        const pctMatch = line.match(/\*\*Percentile:\*\*\s*(\d+)/)
        if (pctMatch) currentResult.percentile = parseInt(pctMatch[1])
      }

      // Parse Lexile/Quantile
      const lexMatch = line.match(/\*\*Lexile Score:\*\*\s*(\d+L)/)
      if (lexMatch) currentResult.lexile_score = lexMatch[1]
      const quantMatch = line.match(/\*\*Quantile Score:\*\*\s*(\d+Q)/)
      if (quantMatch) currentResult.quantile_score = quantMatch[1]

      // Parse school
      const schoolMatch = line.match(/^\*\*School:\*\*\s*(.+?)\s*\((\d+)\)/)
      if (schoolMatch) {
        currentResult.school_name = schoolMatch[1]
        currentResult.school_code = schoolMatch[2]
      }

      // Parse averages
      const avgMatch = line.match(/\*\*State Average:\*\*\s*(\d+)/)
      if (avgMatch) currentResult.state_average = parseInt(avgMatch[1])
      const distMatch = line.match(/\*\*District Average:\*\*\s*(\d+)/)
      if (distMatch) currentResult.district_average = parseInt(distMatch[1])
      const campMatch = line.match(/\*\*Campus Average:\*\*\s*(\d+)/)
      if (campMatch) currentResult.campus_average = parseInt(campMatch[1])

      // Detect category results section
      if (line.startsWith('#### Category Results')) {
        parsingCategories = true
        parsingQuestions = false
        parsingTrend = false
        continue
      }

      // Detect test questions section
      if (line.startsWith('#### Test Questions')) {
        parsingCategories = false
        parsingQuestions = true
        parsingTrend = false
        continue
      }

      // Detect trend section
      if (line.startsWith('#### Lexile Trend') || line.startsWith('#### Quantile Trend')) {
        parsingCategories = false
        parsingQuestions = false
        parsingTrend = true
        trendType = line.includes('Lexile') ? 'lexile' : 'quantile'
        continue
      }

      // Parse category rows
      if (parsingCategories && line.startsWith('|') && !line.includes('Category') && !line.includes('---') && !line.includes('**Total**')) {
        const parts = line.split('|').map(s => s.trim()).filter(Boolean)
        if (parts.length >= 3) {
          const catMatch = parts[0].match(/(\d+)\.\s*(.+)/)
          if (catMatch) {
            const scoreMatch = parts[1].match(/(\d+)\/(\d+)/)
            if (scoreMatch) {
              categories.push({
                number: parseInt(catMatch[1]),
                name: catMatch[2].trim(),
                earned: parseInt(scoreMatch[1]),
                possible: parseInt(scoreMatch[2]),
                percent: parseFloat(parts[2]) || 0,
              })
            }
          }
        }
      }

      // Parse question rows
      if (parsingQuestions && line.startsWith('|') && !line.includes('Item') && !line.includes('---')) {
        const parts = line.split('|').map(s => s.trim()).filter(Boolean)
        if (parts.length >= 4) {
          const itemNum = parseInt(parts[0])
          if (isNaN(itemNum)) continue
          const catMatch = parts[1].match(/(\d+)\.\s*(.+)/)
          const scoreMatch = parts[2].match(/(\d+)\/(\d+)/)
          if (scoreMatch) {
            questions.push({
              item: itemNum,
              cat_num: catMatch ? parseInt(catMatch[1]) : null,
              cat_name: catMatch ? catMatch[2].trim() : parts[1],
              earned: parseInt(scoreMatch[1]),
              possible: parseInt(scoreMatch[2]),
              result: parseResult(parts[3]),
            })
          }
        }
      }

      // Parse trend rows
      if (parsingTrend && line.startsWith('|') && !line.includes('Grade') && !line.includes('---')) {
        const parts = line.split('|').map(s => s.trim()).filter(Boolean)
        if (parts.length >= 3 && !parts[1].includes('—') && parts[1].trim() !== '') {
          const grade = parts[0].trim()
          const score = parts[1].trim()
          const rangeMatch = parts[2].match(/([\d]+[LQ]?)\s*[–-]\s*([\d]+[LQ]?)/)
          if (score) {
            await client.query(
              `INSERT INTO lexile_quantile_trend (kid_name, measure_type, grade, score, expected_range_low, expected_range_high, school_year)
               VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
              [currentKid, trendType, grade, score, rangeMatch?.[1] || null, rangeMatch?.[2] || null, currentYear]
            ).catch(() => {})
            totalTrends++
          }
        }
      }

      // Reset parsing on section breaks
      if (line === '---') {
        parsingCategories = false
        parsingQuestions = false
        parsingTrend = false
      }
    }

    // Save last result
    if (currentResult && currentResult.score > 0) {
      await saveResult(client, currentResult, categories, questions)
      totalResults++
      totalCategories += categories.length
      totalQuestions += questions.length
    }

    console.log(`\n=== STAAR Import Complete ===`)
    console.log(`Results: ${totalResults}`)
    console.log(`Categories: ${totalCategories}`)
    console.log(`Questions: ${totalQuestions}`)
    console.log(`Trends: ${totalTrends}`)

    // Verify per kid
    const verify = await client.query(`SELECT kid_name, COUNT(*)::int as c FROM staar_results GROUP BY kid_name ORDER BY kid_name`)
    console.log('\nPer kid:')
    for (const r of verify.rows) {
      console.log(`  ${r.kid_name}: ${r.c} tests`)
    }

  } catch (err) {
    console.error('Import error:', err)
  } finally {
    client.release()
    await pool.end()
  }
}

async function saveResult(client, result, categories, questions) {
  if (!result.score || result.score === 0) return

  const r = await client.query(
    `INSERT INTO staar_results (kid_name, school_year, test_name, subject, grade_tested, score, performance_level,
     percentile, lexile_score, quantile_score, state_average, district_average, campus_average,
     school_name, school_code, embedded_supports, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'tea_portal') RETURNING id`,
    [result.kid_name, result.school_year, result.test_name, result.subject, result.grade_tested,
     result.score, result.performance_level, result.percentile, result.lexile_score, result.quantile_score,
     result.state_average, result.district_average, result.campus_average,
     result.school_name, result.school_code, result.embedded_supports]
  )
  const resultId = r.rows[0]?.id
  if (!resultId) return

  for (const cat of categories) {
    await client.query(
      `INSERT INTO staar_category_results (staar_result_id, category_number, category_name, points_earned, points_possible, percent)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [resultId, cat.number, cat.name, cat.earned, cat.possible, cat.percent]
    )
  }

  for (const q of questions) {
    await client.query(
      `INSERT INTO staar_test_questions (staar_result_id, item_number, category_number, category_name, points_earned, points_possible, result)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [resultId, q.item, q.cat_num, q.cat_name, q.earned, q.possible, q.result]
    )
  }
}

run()
