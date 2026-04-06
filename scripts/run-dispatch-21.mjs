// Dispatch 21 — Family Huddle: Games, Parent Prep, Toggle + Intelligence
// Run: node scripts/run-dispatch-21.mjs

import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: (process.env.DATABASE_URL || 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:6543/postgres'),
  ssl: { rejectUnauthorized: false }
})

async function run() {
  const client = await pool.connect()
  try {
    console.log('=== Dispatch 21: Family Huddle — Games, Parent Prep, Toggle + Intelligence ===\n')

    // ── 1. ALTER existing tables ──
    console.log('1. Altering family_huddle table...')
    await client.query(`ALTER TABLE family_huddle ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'full' CHECK (mode IN ('quick', 'full'))`)
    await client.query(`ALTER TABLE family_huddle ADD COLUMN IF NOT EXISTS game_type TEXT`)
    await client.query(`ALTER TABLE family_huddle ADD COLUMN IF NOT EXISTS bonus_type TEXT`)
    console.log('   ✅ family_huddle: +mode, +game_type, +bonus_type')

    console.log('2. Altering family_huddle_shares table...')
    await client.query(`ALTER TABLE family_huddle_shares ADD COLUMN IF NOT EXISTS pre_submitted BOOLEAN DEFAULT false`)
    await client.query(`ALTER TABLE family_huddle_shares ADD COLUMN IF NOT EXISTS pre_submitted_at TIMESTAMPTZ`)
    await client.query(`ALTER TABLE family_huddle_shares ADD COLUMN IF NOT EXISTS task_created BOOLEAN DEFAULT false`)
    await client.query(`ALTER TABLE family_huddle_shares ADD COLUMN IF NOT EXISTS task_id INTEGER`)
    console.log('   ✅ family_huddle_shares: +pre_submitted, +pre_submitted_at, +task_created, +task_id')

    // ── 2. New tables ──
    console.log('3. Creating huddle_prep_items...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS huddle_prep_items (
        id SERIAL PRIMARY KEY,
        huddle_id INTEGER REFERENCES family_huddle(id) ON DELETE CASCADE,
        source TEXT NOT NULL,
        kid_name TEXT,
        summary TEXT NOT NULL,
        priority TEXT DEFAULT 'medium' CHECK (priority IN ('hot', 'medium', 'low', 'info')),
        status TEXT DEFAULT 'surfaced' CHECK (status IN ('surfaced', 'bring_up', 'dismissed', 'addressed')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_prep_items_huddle ON huddle_prep_items(huddle_id)`)
    console.log('   ✅ huddle_prep_items')

    console.log('4. Creating huddle_game_templates...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS huddle_game_templates (
        id SERIAL PRIMARY KEY,
        game_type TEXT NOT NULL CHECK (game_type IN ('mad_libs', 'family_trivia', 'vocab_showdown', 'this_or_that')),
        template_text TEXT NOT NULL,
        blank_count INTEGER DEFAULT 0,
        blank_tags TEXT[],
        difficulty TEXT DEFAULT 'all' CHECK (difficulty IN ('easy', 'medium', 'hard', 'all')),
        used_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_game_templates_type ON huddle_game_templates(game_type)`)
    console.log('   ✅ huddle_game_templates')

    console.log('5. Creating huddle_trivia_bank...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS huddle_trivia_bank (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        about_kid TEXT,
        source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'vibe_profile', 'ai_buddy', 'memory')),
        used_count INTEGER DEFAULT 0,
        last_used_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_trivia_bank_used ON huddle_trivia_bank(used_count)`)
    console.log('   ✅ huddle_trivia_bank')

    console.log('6. Creating huddle_prompts...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS huddle_prompts (
        id SERIAL PRIMARY KEY,
        prompt_text TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        interest_tags TEXT[],
        used_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    console.log('   ✅ huddle_prompts')

    console.log('7. Creating huddle_game_log...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS huddle_game_log (
        id SERIAL PRIMARY KEY,
        huddle_id INTEGER REFERENCES family_huddle(id) ON DELETE CASCADE,
        game_type TEXT NOT NULL,
        game_data JSONB,
        memorable_moment TEXT,
        duration_seconds INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_game_log_huddle ON huddle_game_log(huddle_id)`)
    console.log('   ✅ huddle_game_log')

    console.log('8. Creating huddle_bonus_rounds...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS huddle_bonus_rounds (
        id SERIAL PRIMARY KEY,
        huddle_id INTEGER REFERENCES family_huddle(id) ON DELETE CASCADE,
        bonus_type TEXT NOT NULL CHECK (bonus_type IN ('gratitude', 'goal_checkin', 'family_challenge')),
        kid_name TEXT,
        content TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bonus_rounds_huddle ON huddle_bonus_rounds(huddle_id)`)
    console.log('   ✅ huddle_bonus_rounds')

    console.log('9. Creating huddle_challenges...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS huddle_challenges (
        id SERIAL PRIMARY KEY,
        challenge_text TEXT NOT NULL,
        category TEXT DEFAULT 'general' CHECK (category IN ('general', 'kindness', 'adventure', 'learning', 'creative', 'food', 'screen_free')),
        used_count INTEGER DEFAULT 0,
        last_used_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_challenges_used ON huddle_challenges(used_count)`)
    console.log('   ✅ huddle_challenges')

    console.log('10. Creating huddle_action_items...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS huddle_action_items (
        id SERIAL PRIMARY KEY,
        huddle_id INTEGER REFERENCES family_huddle(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        destination TEXT DEFAULT 'my_day' CHECK (destination IN ('my_day', 'grocery', 'note')),
        kid_name TEXT,
        status TEXT DEFAULT 'created' CHECK (status IN ('created', 'completed', 'dismissed')),
        external_task_id INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_action_items_huddle ON huddle_action_items(huddle_id)`)
    console.log('   ✅ huddle_action_items')

    // ── 3. Seed Data ──

    // Mad Lib Templates (15)
    console.log('\n11. Seeding Mad Lib templates...')
    const madLibs = [
      { text: `Our family went on a field trip to {place}. {name} brought a {adjective} {noun} in their backpack. When we got there, a {animal} was {verb_ing} on the roof! Dad tried to {verb} it but ended up {verb_ing} into a {noun} instead.`, blanks: 8, tags: ['place','name','adjective','noun','animal','verb_ing','verb','verb_ing','noun'] },
      { text: `Last night, {name} tried to make {noun} for dinner. They accidentally added {number} cups of {noun} and a whole {animal}. It tasted {adjective} and the kitchen smelled like {adjective} {noun} for three days.`, blanks: 8, tags: ['name','noun','number','noun','animal','adjective','adjective','noun'] },
      { text: `Belle was being {adjective} so {name} took her on a walk to {place}. On the way, they found a {adjective} {noun} and a {animal} wearing {noun}. Belle tried to {verb} it but just ended up {verb_ing} in circles.`, blanks: 8, tags: ['adjective','name','place','adjective','noun','animal','noun','verb','verb_ing'] },
      { text: `Dear parents, your child {name} was caught {verb_ing} a {noun} during {noun} class. The teacher was {adjective} and said it was the most {adjective} thing since {name} tried to {verb} the {noun} last week.`, blanks: 8, tags: ['name','verb_ing','noun','noun','adjective','adjective','name','verb','noun'] },
      { text: `{name} built a spaceship out of {number} {noun} and a {adjective} {noun}. They flew to {place} where they met a {adjective} {animal} who could {verb}. The alien said, "Welcome! Would you like some {noun}?"`, blanks: 9, tags: ['name','number','noun','adjective','noun','place','adjective','animal','verb','noun'] },
      { text: `{name} planned a surprise party for {name}. The cake was shaped like a {noun} and tasted {adjective}. The pinata was full of {noun} and {number} {animal}. Everyone agreed it was the most {adjective} party ever.`, blanks: 8, tags: ['name','name','noun','adjective','noun','number','animal','adjective'] },
      { text: `There's a {adjective} monster living under {name}'s bed. It eats {noun} for breakfast and {verb} all night long. Last Tuesday it {verb_past} the {noun} and scared the {animal}. Mom said we should {verb} it.`, blanks: 8, tags: ['adjective','name','noun','verb','verb_past','noun','animal','verb'] },
      { text: `The Moses family drove to {place} in a {adjective} {noun}. {name} complained they had to sit next to a {animal}. Dad kept trying to {verb} while driving and Mom kept yelling "{verb}!" every time she saw a {noun}.`, blanks: 8, tags: ['place','adjective','noun','name','animal','verb','verb','noun'] },
      { text: `{name} invented a machine that turns {noun} into {noun}. It runs on {number} {adjective} {noun} and sounds like a {animal} {verb_ing}. They showed it to {name} who immediately tried to {verb} it.`, blanks: 9, tags: ['name','noun','noun','number','adjective','noun','animal','verb_ing','name','verb'] },
      { text: `Last night {name} dreamed they were a {adjective} {animal} living in {place}. They could {verb} faster than anyone and their best friend was a {noun} named {name}. When they woke up, they {verb_past} all the way to breakfast.`, blanks: 8, tags: ['name','adjective','animal','place','verb','noun','name','verb_past'] },
      { text: `{name} opened a restaurant called "The {adjective} {animal}." The special of the day was {noun} soup with {adjective} {noun} on the side. {name} ordered {number} of everything and the waiter just {verb_past}.`, blanks: 9, tags: ['name','adjective','animal','noun','adjective','noun','name','number','verb_past'] },
      { text: `During show and tell, {name} brought a {adjective} {noun} they found in the {place}. It could {verb} and smelled like {noun}. The whole class started {verb_ing} and the principal called it "{adjective}."`, blanks: 8, tags: ['name','adjective','noun','place','verb','noun','verb_ing','adjective'] },
      { text: `{name} and {name} started a band called "The {adjective} {animal}." Their hit song was about {verb_ing} a {noun} in {place}. They played {number} concerts and every audience member got a free {noun}.`, blanks: 9, tags: ['name','name','adjective','animal','verb_ing','noun','place','number','noun'] },
      { text: `One morning, {name} woke up and found a {adjective} {animal} sitting on the {noun}. It was wearing {noun} and holding a {noun}. {name} tried to {verb} it, but it just looked at them and said "{adjective}!"`, blanks: 9, tags: ['name','adjective','animal','noun','noun','noun','name','verb','adjective'] },
      { text: `The family talent show was wild. {name} juggled {number} {noun} while {verb_ing}. {name} did a {adjective} dance with a {animal}. The judges gave everyone {noun} and declared it the most {adjective} show in history.`, blanks: 9, tags: ['name','number','noun','verb_ing','name','adjective','animal','noun','adjective'] },
    ]

    const existingTemplates = await client.query(`SELECT COUNT(*)::int as c FROM huddle_game_templates WHERE game_type = 'mad_libs'`)
    if (existingTemplates.rows[0].c === 0) {
      for (const ml of madLibs) {
        await client.query(
          `INSERT INTO huddle_game_templates (game_type, template_text, blank_count, blank_tags) VALUES ('mad_libs', $1, $2, $3)`,
          [ml.text, ml.blanks, ml.tags]
        )
      }
      console.log(`   ✅ ${madLibs.length} Mad Lib templates seeded`)
    } else {
      console.log(`   ⏭️  Mad Lib templates already exist (${existingTemplates.rows[0].c})`)
    }

    // Family Trivia (25+)
    console.log('12. Seeding Family Trivia...')
    const trivia = [
      { q: 'What instrument or sound can Lola NOT hear well?', a: 'High frequencies (hard of hearing)', about: null },
      { q: "What animal is Ellie's bunny Midnight?", a: 'Lionhead Dwarf', about: 'ellie' },
      { q: 'What snake does Zoey take care of?', a: 'Black-headed Ball Python named Hades', about: 'zoey' },
      { q: "What does Amos's lizard Spike need to stay healthy?", a: 'UVB light + warm baths', about: 'amos' },
      { q: "What is Hannah's favorite thing to do in the kitchen?", a: 'Cooking and baking', about: 'hannah' },
      { q: 'What percentile did Ellie score for math GROWTH?', a: '99th percentile', about: 'ellie' },
      { q: 'What subject does Zoey love that involves maps?', a: 'Geography', about: 'zoey' },
      { q: 'What sound is Wyatt working on in speech?', a: '/r/ sounds', about: 'wyatt' },
      { q: "What is Kaylee's favorite activity?", a: 'Theater and acting', about: 'kaylee' },
      { q: 'What kind of hamster did Hannah have before Midnight?', a: 'Dwarf Siberian named Snowflake', about: 'hannah' },
      { q: 'What does Dad do for Triton?', a: 'Handyman and field work', about: null },
      { q: "What does Mom's business Grit Collective make?", a: 'Art, pottery, decor, and jewelry', about: null },
      { q: 'What color does Wyatt see differently?', a: 'Shifted hues — color vision deficiency', about: 'wyatt' },
      { q: 'What grade is Zoey in?', a: '9th grade', about: 'zoey' },
      { q: 'What business does the family run for handyman work?', a: 'Triton Handyman Services', about: null },
      { q: 'What medication do Amos and Wyatt both take in the morning?', a: 'Focalin', about: null },
      { q: "What is the name of Kaylee's old guinea pig?", a: 'Maple', about: 'kaylee' },
      { q: 'What town does the family live in?', a: 'Boerne, Texas', about: null },
      { q: 'What day does Belle get a bath?', a: 'Biweekly Saturdays', about: null },
      { q: 'How many kids are homeschooled?', a: '4 — Amos, Ellie, Wyatt, Hannah', about: null },
      { q: "What is Ellie's bunny's full name?", a: 'Midnight, aka Bun Bun', about: 'ellie' },
      { q: 'What does JROTC stand for that Zoey is in?', a: "Junior Reserve Officers' Training Corps", about: 'zoey' },
      { q: 'What animal is Spike?', a: 'Bearded Dragon', about: 'amos' },
      { q: 'Where are Grandma and Grandpa building a new home?', a: 'Roslyn, South Dakota', about: null },
      { q: 'What games does Hannah love to play on the computer?', a: 'Roblox and Minecraft', about: 'hannah' },
      { q: "What is the name of the family's dog?", a: 'Belle', about: null },
      { q: 'How many kids are in the Moses family?', a: 'Six', about: null },
      { q: 'What does Amos take at bedtime to help with sleep?', a: 'Clonidine', about: 'amos' },
    ]

    const existingTrivia = await client.query(`SELECT COUNT(*)::int as c FROM huddle_trivia_bank`)
    if (existingTrivia.rows[0].c === 0) {
      for (const t of trivia) {
        await client.query(
          `INSERT INTO huddle_trivia_bank (question, answer, about_kid) VALUES ($1, $2, $3)`,
          [t.q, t.a, t.about]
        )
      }
      console.log(`   ✅ ${trivia.length} trivia questions seeded`)
    } else {
      console.log(`   ⏭️  Trivia already exists (${existingTrivia.rows[0].c})`)
    }

    // This or That Prompts (25)
    console.log('13. Seeding This or That prompts...')
    const prompts = [
      { text: 'Would you rather discover a new dinosaur species or discover a new planet?', a: 'New dinosaur species', b: 'New planet', tags: ['dinosaurs','space'] },
      { text: 'Would you rather live in Tokyo, Japan or Reykjavik, Iceland?', a: 'Tokyo, Japan', b: 'Reykjavik, Iceland', tags: ['geography'] },
      { text: "Would you rather be the world's best baker or the world's best potter?", a: 'Best baker', b: 'Best potter', tags: ['cooking','art'] },
      { text: 'Would you rather explore the bottom of the ocean or the surface of Mars?', a: 'Bottom of the ocean', b: 'Surface of Mars', tags: ['space','adventure'] },
      { text: 'Would you rather have a conversation with any animal or speak every language on Earth?', a: 'Talk to animals', b: 'Speak every language', tags: ['animals','geography'] },
      { text: 'Would you rather act in a movie or direct a movie?', a: 'Act in a movie', b: 'Direct a movie', tags: ['theater'] },
      { text: 'Would you rather be really good at art or really good at music?', a: 'Good at art', b: 'Good at music', tags: ['art','creativity'] },
      { text: 'Would you rather build a treehouse or build a go-kart?', a: 'Build a treehouse', b: 'Build a go-kart', tags: ['building'] },
      { text: 'Would you rather read minds or see the future?', a: 'Read minds', b: 'See the future', tags: ['fun'] },
      { text: 'Would you rather travel 100 years into the past or 100 years into the future?', a: '100 years past', b: '100 years future', tags: ['history','space'] },
      { text: 'Would you rather have unlimited Robux or unlimited Minecraft worlds?', a: 'Unlimited Robux', b: 'Unlimited Minecraft worlds', tags: ['gaming'] },
      { text: 'Would you rather run your own restaurant or run your own pet store?', a: 'Own restaurant', b: 'Own pet store', tags: ['cooking','animals'] },
      { text: 'Would you rather be an astronaut or a marine biologist?', a: 'Astronaut', b: 'Marine biologist', tags: ['space','ocean'] },
      { text: 'Would you rather eat only breakfast food forever or only dinner food forever?', a: 'Only breakfast food', b: 'Only dinner food', tags: ['food'] },
      { text: 'Would you rather have a pet T-Rex or a pet dragon?', a: 'Pet T-Rex', b: 'Pet dragon', tags: ['dinosaurs','fantasy'] },
      { text: 'Would you rather be invisible or be able to fly?', a: 'Be invisible', b: 'Be able to fly', tags: ['classic'] },
      { text: 'Would you rather star in a play or star in a cooking show?', a: 'Star in a play', b: 'Star in a cooking show', tags: ['theater','cooking'] },
      { text: 'Would you rather explore caves or explore the rainforest?', a: 'Explore caves', b: 'Explore the rainforest', tags: ['adventure'] },
      { text: 'Would you rather invent something new or discover something ancient?', a: 'Invent something new', b: 'Discover something ancient', tags: ['building','history'] },
      { text: 'Would you rather live where it is always summer or always snowy?', a: 'Always summer', b: 'Always snowy', tags: ['seasons'] },
      { text: 'Would you rather have a personal robot or a personal jetpack?', a: 'Personal robot', b: 'Personal jetpack', tags: ['tech','adventure'] },
      { text: 'Would you rather write a bestselling book or create a hit video game?', a: 'Bestselling book', b: 'Hit video game', tags: ['creativity','gaming'] },
      { text: 'Would you rather swim with dolphins or ride an elephant?', a: 'Swim with dolphins', b: 'Ride an elephant', tags: ['animals','adventure'] },
      { text: 'Would you rather have a magic paintbrush or a magic cookbook?', a: 'Magic paintbrush', b: 'Magic cookbook', tags: ['art','cooking'] },
      { text: 'Would you rather camp in the mountains or camp on a beach?', a: 'Camp in mountains', b: 'Camp on beach', tags: ['adventure'] },
    ]

    const existingPrompts = await client.query(`SELECT COUNT(*)::int as c FROM huddle_prompts`)
    if (existingPrompts.rows[0].c === 0) {
      for (const p of prompts) {
        await client.query(
          `INSERT INTO huddle_prompts (prompt_text, option_a, option_b, interest_tags) VALUES ($1, $2, $3, $4)`,
          [p.text, p.a, p.b, p.tags]
        )
      }
      console.log(`   ✅ ${prompts.length} This or That prompts seeded`)
    } else {
      console.log(`   ⏭️  Prompts already exist (${existingPrompts.rows[0].c})`)
    }

    // Family Challenges (25+)
    console.log('14. Seeding Family Challenges...')
    const challenges = [
      { text: 'Everyone tries one new food this week', cat: 'food' },
      { text: 'No screens for one evening', cat: 'screen_free' },
      { text: 'Write a handwritten note to someone in the family', cat: 'kindness' },
      { text: 'Everyone cooks or helps make one meal', cat: 'food' },
      { text: 'Go on a family walk together', cat: 'adventure' },
      { text: 'Each person teaches the family one thing they know', cat: 'learning' },
      { text: 'Compliment every family member at least once today', cat: 'kindness' },
      { text: 'Try a new board game or card game together', cat: 'general' },
      { text: 'Everyone shares a song they like — make a family playlist', cat: 'creative' },
      { text: 'Eat dinner outside one night', cat: 'adventure' },
      { text: "Each person does one chore that ISN'T their assigned zone", cat: 'kindness' },
      { text: 'Draw a picture of a family memory', cat: 'creative' },
      { text: 'Make up a family handshake', cat: 'creative' },
      { text: 'Everyone picks a book and reads for 20 minutes together (quiet time)', cat: 'learning' },
      { text: 'No complaining challenge — see who lasts longest', cat: 'general' },
      { text: "Tell Mom and Dad one thing you'd change about how the house runs", cat: 'general' },
      { text: 'Everyone writes down what they want for dinner next week', cat: 'food' },
      { text: 'Surprise a family member with a kind act', cat: 'kindness' },
      { text: 'Share the funniest thing that happened to you this month', cat: 'general' },
      { text: 'Try to learn 3 words in a new language together', cat: 'learning' },
      { text: 'Have a screen-free game night with snacks', cat: 'screen_free' },
      { text: 'Everyone draws their dream house and shares it', cat: 'creative' },
      { text: 'Take a photo of something beautiful you see this week', cat: 'creative' },
      { text: 'Write down 3 things you are grateful for each morning', cat: 'kindness' },
      { text: 'Try making a new recipe together as a family', cat: 'food' },
      { text: 'Have a 10-minute dance party after dinner one night', cat: 'general' },
      { text: 'Each person shares their favorite family memory', cat: 'general' },
    ]

    const existingChallenges = await client.query(`SELECT COUNT(*)::int as c FROM huddle_challenges`)
    if (existingChallenges.rows[0].c === 0) {
      for (const ch of challenges) {
        await client.query(
          `INSERT INTO huddle_challenges (challenge_text, category) VALUES ($1, $2)`,
          [ch.text, ch.cat]
        )
      }
      console.log(`   ✅ ${challenges.length} family challenges seeded`)
    } else {
      console.log(`   ⏭️  Challenges already exist (${existingChallenges.rows[0].c})`)
    }

    console.log('\n=== Dispatch 21 migration complete! ===')
    console.log('Tables created: 8 new, 2 altered')
    console.log(`Seed data: ${madLibs.length} mad libs, ${trivia.length} trivia, ${prompts.length} prompts, ${challenges.length} challenges`)

  } catch (err) {
    console.error('Migration error:', err)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
