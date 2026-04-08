// Seed script: Load 22 Moses family books into the library
// Run: node scripts/seed-library.mjs
// Requires: NEXT_PUBLIC_BASE_URL or defaults to http://localhost:3000

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

const BOOKS = [
  // I Survived Series
  { title: 'I Survived the Shark Attacks of 1916 (Graphic Novel)', author: 'Lauren Tarshis / Haus Studio', type: 'book', genre: 'Nonfiction', grade_min: 3, grade_max: 5, series: 'I Survived', tags: ['adventure', 'history', 'animals'], kids: ['hannah', 'wyatt'] },
  { title: 'I Survived: Five Epic Disasters (True Stories)', author: 'Lauren Tarshis', type: 'book', genre: 'Nonfiction', grade_min: 3, grade_max: 6, series: 'I Survived', tags: ['adventure', 'history', 'science'], kids: ['hannah', 'wyatt'] },

  // The Land of Stories Series
  { title: 'The Land of Stories: The Wishing Spell', author: 'Chris Colfer', type: 'book', genre: 'Fantasy', grade_min: 4, grade_max: 7, series: 'The Land of Stories', series_num: 1, tags: ['fantasy', 'adventure', 'magic'], kids: ['ellie'] },
  { title: 'The Land of Stories: The Enchantress Returns', author: 'Chris Colfer', type: 'book', genre: 'Fantasy', grade_min: 4, grade_max: 7, series: 'The Land of Stories', series_num: 2, tags: ['fantasy', 'adventure', 'magic'], kids: ['ellie'] },
  { title: 'The Land of Stories: A Grimm Warning', author: 'Chris Colfer', type: 'book', genre: 'Fantasy', grade_min: 4, grade_max: 7, series: 'The Land of Stories', series_num: 3, tags: ['fantasy', 'adventure', 'magic'], kids: ['ellie'] },
  { title: 'The Land of Stories: An Author\'s Odyssey', author: 'Chris Colfer', type: 'book', genre: 'Fantasy', grade_min: 4, grade_max: 7, series: 'The Land of Stories', series_num: 5, tags: ['fantasy', 'adventure', 'magic'], kids: ['ellie'] },

  // Thea Stilton Series
  { title: 'Thea Stilton: The Cloud Castle', author: 'Thea Stilton', type: 'book', genre: 'Adventure', grade_min: 2, grade_max: 4, series: 'Thea Stilton', tags: ['adventure', 'fantasy', 'friendship'], kids: ['hannah'] },
  { title: 'Thea Stilton and the Dragon\'s Code', author: 'Thea Stilton', type: 'book', genre: 'Adventure', grade_min: 2, grade_max: 4, series: 'Thea Stilton', tags: ['adventure', 'mystery'], kids: ['hannah'] },
  { title: 'Thea Stilton and the Secret City', author: 'Thea Stilton', type: 'book', genre: 'Adventure', grade_min: 2, grade_max: 4, series: 'Thea Stilton', tags: ['adventure', 'mystery'], kids: ['hannah'] },
  { title: 'Thea Stilton and the Cherry Blossom Adventure', author: 'Thea Stilton', type: 'book', genre: 'Adventure', grade_min: 2, grade_max: 4, series: 'Thea Stilton', tags: ['adventure', 'mystery'], kids: ['hannah'] },
  { title: 'Thea Stilton and the Journey to the Lion\'s Den', author: 'Thea Stilton', type: 'book', genre: 'Adventure', grade_min: 2, grade_max: 4, series: 'Thea Stilton', tags: ['adventure', 'animals'], kids: ['hannah'] },
  { title: 'Thea Stilton and the Star Castaways', author: 'Thea Stilton', type: 'book', genre: 'Adventure', grade_min: 2, grade_max: 4, series: 'Thea Stilton', tags: ['adventure', 'space'], kids: ['hannah'] },
  { title: 'Thea Stilton and the Ice Treasure', author: 'Thea Stilton', type: 'book', genre: 'Adventure', grade_min: 2, grade_max: 4, series: 'Thea Stilton', tags: ['adventure', 'mystery'], kids: ['hannah'] },
  { title: 'Thea Stilton: Big Trouble in the Big Apple', author: 'Thea Stilton', type: 'book', genre: 'Adventure', grade_min: 2, grade_max: 4, series: 'Thea Stilton', tags: ['adventure', 'mystery'], kids: ['hannah'] },
  { title: 'Thea Stilton and the Mountain of Fire', author: 'Thea Stilton', type: 'book', genre: 'Adventure', grade_min: 2, grade_max: 4, series: 'Thea Stilton', tags: ['adventure', 'science'], kids: ['hannah'] },

  // Geronimo Stilton Series
  { title: 'The Cheese Experiment', author: 'Geronimo Stilton', type: 'book', genre: 'Adventure', grade_min: 2, grade_max: 4, series: 'Geronimo Stilton', tags: ['adventure', 'funny', 'animals'], kids: ['hannah', 'wyatt'] },
  { title: 'All Because of a Cup of Coffee', author: 'Geronimo Stilton', type: 'book', genre: 'Adventure', grade_min: 2, grade_max: 4, series: 'Geronimo Stilton', tags: ['adventure', 'funny'], kids: ['hannah', 'wyatt'] },
  { title: 'The Mouse Island Marathon', author: 'Geronimo Stilton', type: 'book', genre: 'Adventure', grade_min: 2, grade_max: 4, series: 'Geronimo Stilton', tags: ['adventure', 'funny', 'sports'], kids: ['hannah', 'wyatt'] },
  { title: 'The Golden Statue Plot', author: 'Geronimo Stilton', type: 'book', genre: 'Adventure', grade_min: 2, grade_max: 4, series: 'Geronimo Stilton', tags: ['adventure', 'mystery'], kids: ['hannah', 'wyatt'] },

  // Other Titles
  { title: 'This Poison Heart', author: 'Kalynn Bayron', type: 'book', genre: 'Fantasy', grade_min: 7, grade_max: 10, tags: ['fantasy', 'mystery', 'nature'], kids: ['amos'] },
  { title: 'The Daggers of Ire', author: 'J.C. Cervantes', type: 'book', genre: 'Fantasy', grade_min: 4, grade_max: 7, tags: ['fantasy', 'adventure', 'magic'], kids: ['ellie', 'wyatt'] },
  { title: 'A Big Day for Baseball (Magic Tree House #29)', author: 'Mary Pope Osborne', type: 'book', genre: 'Adventure', grade_min: 2, grade_max: 4, series: 'Magic Tree House', series_num: 29, tags: ['adventure', 'history', 'sports'], kids: ['hannah', 'wyatt'] },
]

async function seed() {
  console.log(`Seeding ${BOOKS.length} books to ${BASE}/api/library...`)
  let success = 0
  let failed = 0

  for (const book of BOOKS) {
    try {
      const res = await fetch(`${BASE}/api/library`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_item',
          item_type: book.type,
          title: book.title,
          author_or_publisher: book.author,
          grade_min: book.grade_min,
          grade_max: book.grade_max,
          subject_tags: ['elar'],
          who_uses: book.kids || [],
          custom_tags: [
            ...(book.tags || []),
            ...(book.series ? [`series:${book.series}`] : []),
            ...(book.series_num ? [`series_num:${book.series_num}`] : []),
            ...(book.genre ? [`genre:${book.genre}`] : []),
          ],
          condition: 'good',
          added_by: 'parent',
        }),
      })
      const json = await res.json()
      if (res.ok) {
        console.log(`  ✅ ${book.title}`)
        success++
      } else {
        console.log(`  ❌ ${book.title}: ${json.error || res.status}`)
        failed++
      }
    } catch (err) {
      console.log(`  ❌ ${book.title}: ${err.message}`)
      failed++
    }
  }

  console.log(`\nDone: ${success} added, ${failed} failed out of ${BOOKS.length}`)
}

seed()
