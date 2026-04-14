import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(__dirname, '..', 'migrations', 'dispatch_68b_recipe_import.sql'), 'utf8')

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

async function run() {
  const client = await pool.connect()
  try {
    console.log('Running dispatch 68b recipe import migration...')
    await client.query(sql)

    const cols = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'meal_library'
         AND column_name IN ('meal_type','difficulty','ingredients','kid_manager_fit','dietary_notes','has_mushrooms')
       ORDER BY column_name`
    )
    console.log(`\nmeal_library new columns: ${cols.rows.map(r => r.column_name).join(', ')}`)

    const staging = await client.query(
      `SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_name = 'recipe_import_staging'`
    )
    console.log(`recipe_import_staging: ${staging.rows[0].n === 1 ? 'OK' : 'MISSING'}`)

    const byType = await client.query(
      `SELECT meal_type, COUNT(*)::int AS n FROM meal_library GROUP BY meal_type ORDER BY n DESC`
    )
    console.log('\nmeal_library by type:')
    for (const r of byType.rows) console.log(`  ${r.meal_type}: ${r.n}`)

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
