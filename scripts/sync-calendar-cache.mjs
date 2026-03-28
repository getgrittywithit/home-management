#!/usr/bin/env node
/**
 * Calendar Sync Script
 * Reads MCP-fetched Google Calendar JSON files and inserts into calendar_events_cache table.
 * Usage: node scripts/sync-calendar-cache.mjs <json-file1> [json-file2] ...
 * Or pipe: echo '[{"text": "..."}]' | node scripts/sync-calendar-cache.mjs --stdin
 *
 * Also supports direct mode: node scripts/sync-calendar-cache.mjs --direct
 * which reads from a predefined set of calendar data embedded at build time.
 */
import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres';
const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3 });

async function upsertEvents(events) {
  const client = await pool.connect();
  try {
    let inserted = 0;
    for (const e of events) {
      await client.query(
        `INSERT INTO calendar_events_cache (id, title, start_time, end_time, all_day, calendar_name, calendar_id, location, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           start_time = EXCLUDED.start_time,
           end_time = EXCLUDED.end_time,
           all_day = EXCLUDED.all_day,
           calendar_name = EXCLUDED.calendar_name,
           location = EXCLUDED.location,
           description = EXCLUDED.description,
           synced_at = NOW()`,
        [e.id, e.title, e.start, e.end, e.allDay, e.calendarName, e.calendarId, e.location, e.description]
      );
      inserted++;
    }
    return inserted;
  } finally {
    client.release();
  }
}

function parseCalendarJson(text, calendarName, calendarId) {
  let data;
  try {
    const arr = JSON.parse(text);
    if (Array.isArray(arr) && arr[0]?.text) {
      data = JSON.parse(arr[0].text);
    } else {
      data = arr;
    }
  } catch {
    data = JSON.parse(text);
  }

  const events = data.events || [];
  const name = calendarName || data.summary || 'Unknown';

  return events.map(e => ({
    id: e.id,
    title: e.summary || '(No title)',
    start: e.start?.dateTime || e.start?.date || null,
    end: e.end?.dateTime || e.end?.date || null,
    allDay: e.allDay ?? !e.start?.dateTime,
    calendarName: name,
    calendarId: calendarId || e.organizer?.email || '',
    location: e.location || null,
    description: (e.description || '').substring(0, 500) || null,
  })).filter(e => e.start);
}

import { readFileSync } from 'fs';

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--stdin')) {
    let raw = '';
    for await (const chunk of process.stdin) raw += chunk;
    const events = parseCalendarJson(raw);
    const count = await upsertEvents(events);
    console.log(`Synced ${count} events from stdin`);
  } else if (args.length > 0) {
    let total = 0;
    for (const file of args) {
      if (file.startsWith('--')) continue;
      const raw = readFileSync(file, 'utf-8');
      const events = parseCalendarJson(raw);
      const count = await upsertEvents(events);
      console.log(`Synced ${count} events from ${file}`);
      total += count;
    }
    console.log(`Total: ${total} events synced`);
  } else {
    console.log('Usage: node scripts/sync-calendar-cache.mjs <file1.json> [file2.json] ...');
    console.log('       echo json | node scripts/sync-calendar-cache.mjs --stdin');
  }

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
