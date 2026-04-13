import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(__dirname, '..', 'migrations', 'zone_task_overhaul.sql'), 'utf8')

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

async function run() {
  const client = await pool.connect()
  try {
    await client.query(sql)
    const counts = await client.query(
      `SELECT zone_key, task_type, COUNT(*)::int AS n
       FROM zone_task_library
       WHERE zone_key IN ('hotspot','kitchen_zone','guest_bathroom','kids_bathroom','pantry','floors')
         AND active = TRUE
       GROUP BY zone_key, task_type
       ORDER BY zone_key, task_type`
    )
    console.log('After overhaul:')
    for (const r of counts.rows) console.log(`  ${r.zone_key.padEnd(16)} ${r.task_type.padEnd(10)} ${r.n}`)

    const defs = await client.query(
      `SELECT zone_key, display_name, anchor_count, rotating_count
       FROM zone_definitions
       WHERE zone_key IN ('hotspot','kitchen_zone','guest_bathroom','kids_bathroom','pantry','floors')
       ORDER BY zone_key`
    )
    console.log('\nZone definitions:')
    for (const r of defs.rows) console.log(`  ${r.zone_key.padEnd(16)} anchor:${r.anchor_count} rotating:${r.rotating_count} — ${r.display_name}`)
  } finally {
    client.release()
    await pool.end()
  }
}
run().catch(err => { console.error(err); process.exit(1) })
