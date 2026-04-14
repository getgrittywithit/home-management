import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(__dirname, '..', 'migrations', 'dispatch_63_library_redesign.sql'), 'utf8')

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

async function run() {
  const client = await pool.connect()
  try {
    console.log('Running dispatch 63 library redesign migration...')
    await client.query(sql)

    const cols = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'home_library'
         AND column_name IN ('hook','age_range_min','age_range_max','genres','topics','location_details')
       ORDER BY column_name`
    )
    console.log(`\nhome_library new columns: ${cols.rows.map(r => r.column_name).join(', ')}`)

    for (const t of ['library_read_status', 'library_ratings', 'library_reviews']) {
      const r = await client.query(
        `SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_name = $1`,
        [t]
      )
      console.log(`  ${t}: ${r.rows[0].n === 1 ? 'OK' : 'MISSING'}`)
    }

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
