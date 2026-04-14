// Backfill home_library cover images + descriptions from OpenLibrary.
// D68 LIBRARY-FETCH-1 — runs once, then data is stored locally.
// Rate-limited to ~1 request/sec to be polite to Open Library.

import pg from 'pg'

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const UA = 'FamilyHub/1.0 (library-backfill)'

async function fetchOL(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) return null
  return res.json()
}

function pickCover(doc) {
  if (!doc) return null
  if (doc.cover_i) return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
  if (doc.isbn?.[0]) return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg`
  return null
}

async function lookupOpenLibrary(title, author) {
  // Try title+author strict match first
  try {
    const strict = new URLSearchParams({ title, limit: '3' })
    if (author) strict.set('author', author)
    const json = await fetchOL(`https://openlibrary.org/search.json?${strict.toString()}`)
    const doc = json?.docs?.find((d) => pickCover(d)) || json?.docs?.[0]
    if (doc) {
      return {
        cover_url: pickCover(doc),
        description: doc.first_sentence?.[0] || null,
        isbn: doc.isbn?.[0] || null,
      }
    }
  } catch { /* fall through */ }

  // Fall back to loose q= search with title + author
  try {
    const q = [title, author].filter(Boolean).join(' ')
    const loose = new URLSearchParams({ q, limit: '3' })
    const json = await fetchOL(`https://openlibrary.org/search.json?${loose.toString()}`)
    const doc = json?.docs?.find((d) => pickCover(d)) || json?.docs?.[0]
    if (doc) {
      return {
        cover_url: pickCover(doc),
        description: doc.first_sentence?.[0] || null,
        isbn: doc.isbn?.[0] || null,
      }
    }
  } catch { /* fall through */ }

  return null
}

async function run() {
  const client = await pool.connect()
  try {
    const { rows } = await client.query(`
      SELECT id, title, author_or_publisher
      FROM home_library
      WHERE item_type = 'book'
        AND active = TRUE
        AND archived = FALSE
        AND (cover_image_url IS NULL OR cover_image_url = '')
      ORDER BY title
    `)

    console.log(`Backfilling ${rows.length} books…\n`)

    let filled = 0
    let covers = 0
    let descriptions = 0
    let missed = []

    for (let i = 0; i < rows.length; i++) {
      const book = rows[i]
      process.stdout.write(`[${(i + 1).toString().padStart(3)}/${rows.length}] ${book.title.slice(0, 50).padEnd(50)} `)

      const meta = await lookupOpenLibrary(book.title, book.author_or_publisher)
      if (!meta) {
        missed.push(book.title)
        console.log('— miss')
        await sleep(1000)
        continue
      }

      const updates = []
      const params = [book.id]
      if (meta.cover_url) {
        params.push(meta.cover_url)
        updates.push(`cover_image_url = $${params.length}`)
        covers++
      }
      if (meta.description) {
        params.push(meta.description)
        updates.push(`description = COALESCE(NULLIF(description, ''), $${params.length})`)
        descriptions++
      }
      if (meta.isbn) {
        params.push(meta.isbn)
        updates.push(`isbn = COALESCE(NULLIF(isbn, ''), $${params.length})`)
      }

      if (updates.length > 0) {
        await client.query(`UPDATE home_library SET ${updates.join(', ')} WHERE id = $1`, params)
        filled++
        console.log(meta.cover_url ? '✓ cover' : '· no cover')
      } else {
        missed.push(book.title)
        console.log('— no data')
      }

      await sleep(1000)
    }

    console.log(`\nFilled ${filled}/${rows.length} books`)
    console.log(`  Covers:       ${covers}`)
    console.log(`  Descriptions: ${descriptions}`)
    if (missed.length > 0) {
      console.log(`\nMissed (${missed.length}):`)
      for (const t of missed.slice(0, 20)) console.log(`  - ${t}`)
      if (missed.length > 20) console.log(`  …and ${missed.length - 20} more`)
    }
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
