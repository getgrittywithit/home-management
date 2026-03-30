import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// ============================================================================
// GET /api/portfolio?action=...
// ============================================================================
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  switch (action) {
    // ------------------------------------------------------------------
    // get_albums — all albums for a kid
    // ------------------------------------------------------------------
    case 'get_albums': {
      const kidName = searchParams.get('kid_name')
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

      try {
        const albums = await db.query(
          `SELECT pa.*,
                  (SELECT COUNT(*)::int FROM portfolio_items pi WHERE pi.album_id = pa.id) AS item_count,
                  (SELECT pi.file_url FROM portfolio_items pi WHERE pi.album_id = pa.id AND pi.file_url IS NOT NULL ORDER BY pi.created_at DESC LIMIT 1) AS latest_photo
           FROM portfolio_albums pa
           WHERE LOWER(pa.kid_name) = LOWER($1)
           ORDER BY pa.created_at DESC`,
          [kidName]
        )
        return NextResponse.json({ albums })
      } catch (error) {
        console.error('get_albums error:', error)
        return NextResponse.json({ error: 'Failed to load albums' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_album_items — items in an album
    // ------------------------------------------------------------------
    case 'get_album_items': {
      const albumId = searchParams.get('album_id')
      if (!albumId) return NextResponse.json({ error: 'album_id required' }, { status: 400 })

      try {
        const items = await db.query(
          `SELECT * FROM portfolio_items
           WHERE album_id = $1
           ORDER BY date_created DESC, created_at DESC`,
          [albumId]
        )
        return NextResponse.json({ items })
      } catch (error) {
        console.error('get_album_items error:', error)
        return NextResponse.json({ error: 'Failed to load album items' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_all_photos — all portfolio items with photos across all albums
    // ------------------------------------------------------------------
    case 'get_all_photos': {
      const kidName = searchParams.get('kid_name')
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

      try {
        const photos = await db.query(
          `SELECT pi.*, pa.name AS album_name, pa.album_type
           FROM portfolio_items pi
           JOIN portfolio_albums pa ON pi.album_id = pa.id
           WHERE LOWER(pi.kid_name) = LOWER($1)
             AND pi.file_url IS NOT NULL
           ORDER BY pi.date_created DESC, pi.created_at DESC`,
          [kidName]
        )
        return NextResponse.json({ photos })
      } catch (error) {
        console.error('get_all_photos error:', error)
        return NextResponse.json({ error: 'Failed to load photos' }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: `Unknown GET action: ${action}` }, { status: 400 })
  }
}

// ============================================================================
// POST /api/portfolio  { action, ...body }
// ============================================================================
export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, ...data } = body

  switch (action) {
    // ------------------------------------------------------------------
    // create_album
    // ------------------------------------------------------------------
    case 'create_album': {
      const { kid_name, name, album_type, school_year, subject_tag, description } = data
      if (!kid_name || !name) return NextResponse.json({ error: 'kid_name and name required' }, { status: 400 })

      try {
        const result = await db.query(
          `INSERT INTO portfolio_albums (kid_name, name, album_type, school_year, subject_tag, description)
           VALUES (LOWER($1), $2, $3, $4, $5, $6)
           RETURNING *`,
          [kid_name, name, album_type || 'general', school_year || null, subject_tag || null, description || null]
        )
        return NextResponse.json({ album: result[0] }, { status: 201 })
      } catch (error) {
        console.error('create_album error:', error)
        return NextResponse.json({ error: 'Failed to create album' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // add_item — add an item to an album
    // ------------------------------------------------------------------
    case 'add_item': {
      const { album_id, kid_name, title, description, item_type, file_url, lesson_log_id, book_id, subject_tag, date_created, added_by } = data
      if (!album_id || !kid_name) return NextResponse.json({ error: 'album_id and kid_name required' }, { status: 400 })

      try {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const result = await db.query(
          `INSERT INTO portfolio_items
             (album_id, kid_name, title, description, item_type, file_url, lesson_log_id, book_id, subject_tag, date_created, added_by)
           VALUES ($1, LOWER($2), $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING *`,
          [
            album_id,
            kid_name,
            title || null,
            description || null,
            item_type || 'photo',
            file_url || null,
            lesson_log_id || null,
            book_id || null,
            subject_tag || null,
            date_created || today,
            added_by || 'parent',
          ]
        )
        return NextResponse.json({ item: result[0] }, { status: 201 })
      } catch (error) {
        console.error('add_item error:', error)
        return NextResponse.json({ error: 'Failed to add item' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // delete_item
    // ------------------------------------------------------------------
    case 'delete_item': {
      const { item_id } = data
      if (!item_id) return NextResponse.json({ error: 'item_id required' }, { status: 400 })

      try {
        const result = await db.query(
          `DELETE FROM portfolio_items WHERE id = $1 RETURNING *`,
          [item_id]
        )
        if (!result[0]) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        return NextResponse.json({ deleted: result[0] })
      } catch (error) {
        console.error('delete_item error:', error)
        return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // update_album
    // ------------------------------------------------------------------
    case 'update_album': {
      const { album_id, name, description, cover_photo_url } = data
      if (!album_id) return NextResponse.json({ error: 'album_id required' }, { status: 400 })

      try {
        const result = await db.query(
          `UPDATE portfolio_albums
           SET name = COALESCE($2, name),
               description = COALESCE($3, description),
               cover_photo_url = COALESCE($4, cover_photo_url),
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [album_id, name || null, description || null, cover_photo_url || null]
        )
        if (!result[0]) return NextResponse.json({ error: 'Album not found' }, { status: 404 })
        return NextResponse.json({ album: result[0] })
      } catch (error) {
        console.error('update_album error:', error)
        return NextResponse.json({ error: 'Failed to update album' }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: `Unknown POST action: ${action}` }, { status: 400 })
  }
}
