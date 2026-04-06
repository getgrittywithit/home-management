// Dispatch 22 — Phase 5.6 Final: Close It Out
// Run: node scripts/run-dispatch-22.mjs

import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: (process.env.DATABASE_URL || 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:6543/postgres'),
  ssl: { rejectUnauthorized: false }
})

async function run() {
  const client = await pool.connect()
  try {
    console.log('=== Dispatch 22: Phase 5.6 Final ===\n')

    // ── 1. kid_regulation_profiles ──
    console.log('1. Creating kid_regulation_profiles...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS kid_regulation_profiles (
        id SERIAL PRIMARY KEY,
        kid_name TEXT NOT NULL,
        strategy_type TEXT NOT NULL,
        strategy_name TEXT NOT NULL,
        strategy_description TEXT,
        effectiveness_score REAL DEFAULT 0.5,
        times_used INTEGER DEFAULT 0,
        times_helped INTEGER DEFAULT 0,
        added_by TEXT DEFAULT 'system',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_regulation_kid ON kid_regulation_profiles(kid_name)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_regulation_active ON kid_regulation_profiles(active)`)
    console.log('   ✅ kid_regulation_profiles')

    // Seed strategies
    const existing = await client.query(`SELECT COUNT(*)::int as c FROM kid_regulation_profiles`)
    if (existing.rows[0].c === 0) {
      const strategies = [
        ['amos', 'sensory', 'Noise-Canceling Headphones', 'Put on headphones and listen to calm instrumental music for 5 minutes'],
        ['amos', 'physical', 'Walk Outside', 'Take a 5-minute walk around the yard — fresh air and movement reset'],
        ['amos', 'cognitive', 'Name 5 Things', 'Look around and name 5 things you can see, 4 you can touch, 3 you can hear'],
        ['amos', 'social', 'Talk to Dad', "Find Dad and talk about what's bugging you — he gets it"],
        ['zoey', 'creative', 'Sketch It Out', "Grab your sketchbook and draw what you're feeling — no rules"],
        ['zoey', 'physical', 'Stretching', '5 minutes of slow stretches — focus on breathing'],
        ['zoey', 'cognitive', 'Journal Quick Dump', "Write 3 sentences about what's on your mind — just get it out"],
        ['zoey', 'social', 'Text a Friend', 'Send a quick text to someone who makes you smile'],
        ['kaylee', 'sensory', 'Soft Blanket Time', "Wrap up in your favorite blanket for 5 minutes — it's okay to rest"],
        ['kaylee', 'physical', 'Dance Break', 'Put on your favorite song and dance it out — 1 song, full volume'],
        ['kaylee', 'creative', 'Theater Voice', 'Practice your lines or do a silly voice — channel it into your acting'],
        ['kaylee', 'social', 'Talk to Mom', "Find Mom and tell her what you need — she'll help"],
        ['ellie', 'sensory', 'Quiet Corner', 'Find your quiet spot — 10 minutes with no one talking to you'],
        ['ellie', 'physical', 'Jump Rope', '50 jumps — burns off the restless energy fast'],
        ['ellie', 'cognitive', 'Pros and Cons List', "Write a quick list of what's bothering you vs. what's going well"],
        ['ellie', 'creative', 'Build Something', 'Grab craft supplies and make something — hands busy, brain calm'],
        ['wyatt', 'physical', 'Run Laps', 'Run 3 laps around the house — outside if possible, inside if not'],
        ['wyatt', 'sensory', 'Squeeze Ball', 'Grab the squeeze ball and crush it 20 times with each hand'],
        ['wyatt', 'physical', 'Push-Up Challenge', 'Do as many push-ups as you can — try to beat yesterday'],
        ['wyatt', 'cognitive', 'Countdown Breathing', 'Breathe in for 4, hold for 4, out for 4 — do it 5 times'],
        ['hannah', 'sensory', 'Ear Protectors + Music', 'Put on your ear protectors and listen to calm music for 5 minutes'],
        ['hannah', 'creative', 'Plant Time', 'Go check on your plants — water them, talk to them, touch the soil'],
        ['hannah', 'physical', 'Gentle Yoga', '5 minutes of kid yoga poses — cat-cow, tree, butterfly'],
        ['hannah', 'social', 'Hug From Mom', "Go get a hug from Mom — sometimes that's all you need"],
      ]
      for (const [kid, type, name, desc] of strategies) {
        await client.query(
          `INSERT INTO kid_regulation_profiles (kid_name, strategy_type, strategy_name, strategy_description) VALUES ($1, $2, $3, $4)`,
          [kid, type, name, desc]
        )
      }
      console.log(`   ✅ ${strategies.length} regulation strategies seeded`)
    } else {
      console.log(`   ⏭️  Strategies already exist (${existing.rows[0].c})`)
    }

    // ── 2. bonus_star_events ──
    console.log('2. Creating bonus_star_events...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS bonus_star_events (
        id SERIAL PRIMARY KEY,
        kid_name TEXT NOT NULL,
        trigger_type TEXT NOT NULL,
        bonus_amount INTEGER NOT NULL,
        message TEXT NOT NULL,
        seen BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bonus_stars_kid ON bonus_star_events(kid_name)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bonus_stars_seen ON bonus_star_events(seen)`)
    console.log('   ✅ bonus_star_events')

    console.log('\n=== Dispatch 22 migration complete! ===')
    console.log('Tables: 2 new (kid_regulation_profiles, bonus_star_events)')
    console.log('Seed: 24 regulation strategies')

  } catch (err) {
    console.error('Migration error:', err)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
