import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(__dirname, '..', 'migrations', 'dispatch_66_household_needs.sql'), 'utf8')

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

async function run() {
  const client = await pool.connect()
  try {
    console.log('Running dispatch 66 household_needs migration...')
    await client.query(sql)

    for (const t of ['household_needs', 'household_need_categories']) {
      const r = await client.query(
        `SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_name = $1`,
        [t]
      )
      console.log(`  ${t}: ${r.rows[0].n === 1 ? 'OK' : 'MISSING'}`)
    }

    const cats = await client.query(
      `SELECT name, icon, sort_order FROM household_need_categories WHERE is_archived = FALSE ORDER BY sort_order`
    )
    console.log(`\nSeeded ${cats.rowCount} categories:`)
    for (const c of cats.rows) console.log(`  ${c.sort_order.toString().padStart(2, ' ')}. ${c.icon} ${c.name}`)

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
