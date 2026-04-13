import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, '..', 'migrations')

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

const files = [
  'inventory_spice_expansion.sql',
  'inventory_condiments_expansion.sql',
  'inventory_oils_expansion.sql',
  'inventory_baking_expansion.sql',
  'inventory_fridge_expansion.sql',
  'inventory_pantry_expansion.sql',
]

async function run() {
  const client = await pool.connect()
  try {
    const beforeRows = await client.query('SELECT COUNT(*)::int AS c FROM inventory_items WHERE active = TRUE')
    console.log(`Before: ${beforeRows.rows[0].c} active inventory_items`)

    for (const file of files) {
      const sql = readFileSync(join(migrationsDir, file), 'utf8')
      const result = await client.query(sql)
      console.log(`OK ${file}: ${result.rowCount ?? 0} row(s) inserted`)
    }

    const afterRows = await client.query('SELECT COUNT(*)::int AS c FROM inventory_items WHERE active = TRUE')
    console.log(`\nAfter: ${afterRows.rows[0].c} active inventory_items`)
    console.log(`Net added: ${afterRows.rows[0].c - beforeRows.rows[0].c}`)

    const catRows = await client.query(
      `SELECT category, COUNT(*)::int AS total
       FROM inventory_items
       WHERE active = TRUE
       GROUP BY category
       ORDER BY category`
    )
    console.log('\nCategory totals:')
    for (const r of catRows.rows) console.log(`  ${r.category.padEnd(20)} ${r.total}`)

    const subRows = await client.query(
      `SELECT category, sub_category, COUNT(*)::int AS total
       FROM inventory_items
       WHERE active = TRUE AND sub_category IN ('Korean','Caribbean','Indian','Irish','Asian Sauces','Mexican Sauces','BBQ & American','Italian Sauces','Caribbean Sauces','Mediterranean','Flours','Baking Fats','Extracts','Sweeteners','Chocolate','Decorating','Toppings','Nuts & Dried Fruit','Dairy - Cooking','Fresh Produce','International','Oils & Vinegars','Dressings','Condiments')
       GROUP BY category, sub_category
       ORDER BY category, sub_category`
    )
    console.log('\nNew sub-categories:')
    for (const r of subRows.rows) console.log(`  ${r.category.padEnd(18)} ${r.sub_category.padEnd(22)} ${r.total}`)
  } finally {
    client.release()
    await pool.end()
  }
}
run().catch(err => { console.error(err); process.exit(1) })
