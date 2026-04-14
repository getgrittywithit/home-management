import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(__dirname, '..', 'migrations', 'dispatch_67_homeschool_daily.sql'), 'utf8')

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

async function run() {
  const client = await pool.connect()
  try {
    console.log('Running dispatch 67 homeschool daily engine migration...')
    await client.query(sql)

    for (const t of ['homeschool_subjects', 'homeschool_daily_tasks']) {
      const r = await client.query(
        `SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_name = $1`,
        [t]
      )
      console.log(`  ${t}: ${r.rows[0].n === 1 ? 'OK' : 'MISSING'}`)
    }

    const bySubject = await client.query(
      `SELECT kid_name, COUNT(*)::int AS n FROM homeschool_subjects WHERE is_active = TRUE GROUP BY kid_name ORDER BY kid_name`
    )
    console.log('\nSubjects per homeschool kid:')
    for (const r of bySubject.rows) console.log(`  ${r.kid_name.padEnd(8)} ${r.n} subjects`)

    console.log('\nMigration complete.')
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
