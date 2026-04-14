import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(__dirname, '..', 'migrations', 'dispatch_69_homeschool_templates.sql'), 'utf8')

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

async function run() {
  const client = await pool.connect()
  try {
    console.log('Running dispatch 69 homeschool templates migration...')
    await client.query(sql)

    const r = await client.query(
      `SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_name = 'homeschool_templates'`
    )
    console.log(`  homeschool_templates: ${r.rows[0].n === 1 ? 'OK' : 'MISSING'}`)

    const idx = await client.query(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'homeschool_templates'`
    )
    console.log('  indexes:', idx.rows.map((x) => x.indexname).join(', '))

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
