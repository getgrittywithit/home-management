import pg from 'pg'
import { readFileSync } from 'fs'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres'

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  const sql = readFileSync(process.argv[2] || 'migrations/kid_health_requests.sql', 'utf-8')
  await client.query(sql)
  console.log('Migration completed successfully')
} catch (err) {
  console.error('Migration error:', err.message)
} finally {
  await client.end()
}
