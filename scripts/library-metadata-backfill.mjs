// Library Metadata Backfill — fetches cover images, descriptions, ISBNs, page counts
// from OpenLibrary (primary) and Google Books (fallback) for all books missing metadata.
// Run: node scripts/library-metadata-backfill.mjs

import pg from 'pg'

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function searchOpenLibrary(title, author) {
  const q = encodeURIComponent(`${title} ${author || ''}`.trim())
  try {
    const res = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=3`, {
      headers: { 'User-Agent': 'CoralFamilyApp/1.0 (mosesfamily2008@gmail.com)' }
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.docs?.length) return null
    const best = data.docs[0]
    return {
      cover_url: best.cover_i ? `https://covers.openlibrary.org/b/id/${best.cover_i}-M.jpg` : null,
      description: best.first_sentence?.join(' ') || null,
      isbn: best.isbn?.[0] || null,
      pages: best.number_of_pages_median || null,
      source: 'openlibrary',
    }
  } catch { return null }
}

async function searchGoogleBooks(title, author) {
  const q = encodeURIComponent(`intitle:${title}${author ? ` inauthor:${author}` : ''}`)
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`)
    if (!res.ok) return null
    const data = await res.json()
    const item = data.items?.[0]?.volumeInfo
    if (!item) return null
    return {
      cover_url: item.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
      description: item.description?.substring(0, 500) || null,
      isbn: item.industryIdentifiers?.[0]?.identifier || null,
      pages: item.pageCount || null,
      source: 'google_books',
    }
  } catch { return null }
}

async function run() {
  const client = await pool.connect()
  try {
    const books = await client.query(
      `SELECT id, title, author FROM home_library WHERE (cover_image_url IS NULL OR description IS NULL) ORDER BY title`
    )
    console.log(`Found ${books.rows.length} books needing metadata`)

    let enriched = 0, notFound = 0

    for (const book of books.rows) {
      let result = await searchOpenLibrary(book.title, book.author)
      if (!result?.cover_url) {
        await sleep(500)
        result = await searchGoogleBooks(book.title, book.author)
      }

      if (result) {
        await client.query(
          `UPDATE home_library SET
             cover_image_url = COALESCE($2, cover_image_url),
             description = COALESCE($3, description),
             description_short = COALESCE(LEFT($3, 200), description_short),
             isbn = COALESCE($4, isbn),
             total_pages = COALESCE($5, total_pages),
             lookup_source = $6,
             lookup_at = NOW()
           WHERE id = $1`,
          [book.id, result.cover_url, result.description, result.isbn, result.pages, result.source]
        )
        enriched++
        console.log(`  ✅ ${book.title} — ${result.source}`)
      } else {
        await client.query(
          `UPDATE home_library SET lookup_source = 'not_found', lookup_at = NOW() WHERE id = $1`, [book.id]
        )
        notFound++
        console.log(`  ❌ ${book.title} — not found`)
      }

      await sleep(1100) // Rate limit: 1 req/sec for OpenLibrary
    }

    console.log(`\nDone — enriched: ${enriched}, not found: ${notFound}`)
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch(err => { console.error(err); process.exit(1) })
