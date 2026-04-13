import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(__dirname, '..', 'migrations', 'family_books_seed.sql'), 'utf8')

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

async function run() {
  const client = await pool.connect()
  try {
    const before = await client.query(`SELECT COUNT(*)::int AS n FROM home_library WHERE item_type = 'book'`)
    console.log(`Before: ${before.rows[0].n} books`)

    // Skip seed if already has substantial library (guard against double-run)
    if (before.rows[0].n >= 50) {
      console.log('Library already seeded (>= 50 books). Skipping to avoid duplicates.')
      return
    }

    await client.query(sql)

    const after = await client.query(`SELECT COUNT(*)::int AS n FROM home_library WHERE item_type = 'book'`)
    console.log(`After: ${after.rows[0].n} books (added ${after.rows[0].n - before.rows[0].n})`)

    const bySubject = await client.query(
      `SELECT unnest(subject_tags) AS tag, COUNT(*)::int AS n
       FROM home_library
       WHERE item_type = 'book'
       GROUP BY tag
       ORDER BY n DESC`
    )
    console.log('\nBy subject tag:')
    for (const r of bySubject.rows) console.log(`  ${r.tag.padEnd(18)} ${r.n}`)
  } finally {
    client.release()
    await pool.end()
  }
}
run().catch(err => { console.error(err); process.exit(1) })
