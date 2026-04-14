// Seed ELAR placement passages — Batch 1b (5 Amos-specific passages)
// Key rule: Amos reads at 2nd-3rd level but is 17. Content uses simple sentence
// structure but age-appropriate topics (tools, trades, trucks, pets, construction).
//
// Thanks to the interest_tag column (migration dispatch_elar_interest_tag.sql),
// these can coexist in the same (skill, level, passage_number) slots as Hannah's
// 2nd-3rd passages. The placement API filters by interest_tag at query time.

import pg from 'pg'

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

const DIFFICULTY_TO_PN = { easy: 1, medium: 2, hard: 3 }

const AMOS_INTEREST_TAG = 'amos'

const passages = [
  {
    skill_id: 'R1',
    reading_level: '2nd-3rd',
    difficulty: 'easy',
    age_appropriate_context: 'Toolbox basics — Amos trades (teen at 2nd-3rd level)',
    passage_text:
      "A good toolbox needs a few key things. First, you need a hammer. Hammers help you drive nails into wood. Next, you need a tape measure. You should always measure before you cut. A set of screwdrivers is important too — both flat and Phillips head. Pliers help you grip and pull things. And you always need a level to make sure things are straight. With just these five tools, you can do a lot of basic fix-it jobs around the house.",
    question: 'What is the main idea of this passage? Name three tools from the toolbox and what they do.',
    answer_key:
      'The main idea is that a good basic toolbox needs five key tools for fix-it jobs. Three tools: hammer (drives nails), tape measure (measure before cutting), screwdrivers (flat and Phillips), pliers (grip and pull), level (checks if things are straight).',
    scoring_rubric: {
      detailed:
        "States the main idea about basic toolbox needs. Names 3+ tools AND what each one does. May mention 'measure before you cut' rule.",
      adequate: 'General main idea about tools. Names at least 2 tools with what they do.',
      vague: "Says 'it's about tools' without naming specific tools or their uses.",
      skipped: "No response or 'I don't know.'",
    },
  },
  {
    skill_id: 'R4',
    reading_level: '2nd-3rd',
    difficulty: 'easy',
    age_appropriate_context: 'Fixing a leaky faucet — Amos trades',
    passage_text:
      "Dad got a call about a leaky faucet. First, he turned off the water under the sink. Then he used a wrench to take the faucet apart. He found a small rubber ring that was cracked and worn out. That was the problem. He drove to the hardware store and bought a new one for two dollars. Back at the house, he put the new ring in place and tightened everything back up. He turned the water on. No more leak. The whole job took about forty minutes.",
    question: 'List the steps Dad took to fix the leaky faucet, from first to last.',
    answer_key:
      '1. Turned off the water. 2. Used a wrench to take the faucet apart. 3. Found the cracked rubber ring. 4. Drove to hardware store and bought a new ring ($2). 5. Put the new ring in and tightened everything. 6. Turned the water back on — no more leak.',
    scoring_rubric: {
      detailed:
        'Lists 5+ steps in correct order. Includes both the diagnosis (cracked ring) and the fix (bought new one, reassembled). Notes the water was turned off first and on last.',
      adequate: 'Lists 3-4 steps in mostly correct order. Covers the main fix.',
      vague: "Says 'he fixed the faucet' without listing specific steps.",
      skipped: "No response or 'I don't know.'",
    },
  },
  {
    skill_id: 'R2',
    reading_level: '2nd-3rd',
    difficulty: 'medium',
    age_appropriate_context: "Amos bathing Spike the bearded dragon — Amos pets",
    passage_text:
      "Spike sat on his warm rock under the heat lamp. His skin looked dull and dry. It was time for a bath. Amos filled a shallow tub with warm water — not hot, not cold. He set Spike in gently. Spike did not like baths. He puffed up his beard and turned it dark. But Amos talked to him in a calm voice and used a soft toothbrush to rub his back. After a few minutes, Spike stopped puffing. His beard went back to normal. Amos lifted him out, dried him with a towel, and set him back on his rock. \"Good job, buddy,\" Amos said.",
    question: 'What kind of pet owner is Amos? How does he handle Spike being upset during the bath?',
    answer_key:
      "Amos is a patient and gentle pet owner. When Spike got upset (puffed up his beard, turned it dark), Amos didn't rush or get frustrated. He used a calm voice and a soft toothbrush, and waited for Spike to relax before continuing. He praised Spike after.",
    scoring_rubric: {
      detailed:
        "Identifies Amos as patient/gentle/caring with 2+ text details (calm voice, soft toothbrush, waited for Spike to calm down, praised him). Recognizes the beard puffing as Spike's stress signal.",
      adequate: 'Says Amos was nice or patient. Mentions at least one calming action.',
      vague: "Says 'he gave Spike a bath' without describing how he handled the stress.",
      skipped: "No response or 'I don't know.'",
    },
  },
  {
    skill_id: 'R10',
    reading_level: '2nd-3rd',
    difficulty: 'easy',
    age_appropriate_context: 'Loaded truck — Amos trucks/trades',
    passage_text:
      "The truck was loaded down. The back end sagged low and the tires looked almost flat. Pieces of wood stuck out past the tailgate. A red flag hung from the longest board. The man driving it went very slow around every turn. When he got to the job site, two other guys helped him unload everything one board at a time. It took them twenty minutes.",
    question: 'What was in the back of the truck? How do you know? Use clues from the story.',
    answer_key:
      'The truck was carrying a heavy load of lumber/wood boards. Clues: pieces of wood stuck out past the tailgate, a red flag on the longest board (safety flag for long loads), the truck sagged low, tires looked flat (heavy weight), the driver went slow (careful with heavy load), and they unloaded boards one at a time.',
    scoring_rubric: {
      detailed:
        'Identifies lumber/wood boards. Cites 2+ clues (wood sticking out, red flag, sagging, slow driving, unloading boards).',
      adequate: 'Identifies wood or boards. Mentions at least one clue.',
      vague: "Says 'stuff' or 'heavy things' without identifying wood or citing clues.",
      skipped: "No response or 'I don't know.'",
    },
  },
  {
    skill_id: 'R9',
    reading_level: '2nd-3rd',
    difficulty: 'medium',
    age_appropriate_context: 'Paint prep vocab — Amos construction',
    passage_text:
      "Before you paint a wall, you have to prep it. First, fill any holes with spackle — a thick paste that dries hard. Smooth it flat with a putty knife. Once it is dry, sand it so the wall feels even. Then wipe the dust off with a damp cloth. Now you tape off the edges. Put painter's tape along the trim, the ceiling line, and around light switches. This protects those areas from getting paint on them. Good prep makes the paint job look clean and professional.",
    question: 'What does the word "prep" mean in this passage? What does "spackle" mean? How did the passage help you figure out the meaning?',
    answer_key:
      '"Prep" means to prepare or get ready — in this case, getting the wall ready before painting. "Spackle" means a thick paste used to fill holes in walls that dries hard. The passage explains both words by showing what you do (fill holes, sand, tape) and describing spackle right after the word ("a thick paste that dries hard").',
    scoring_rubric: {
      detailed:
        "Defines both 'prep' (prepare/get ready) and 'spackle' (thick paste for filling holes). Explains that the passage defined them in context — spackle has a built-in definition, prep is explained through the list of steps.",
      adequate: 'Defines at least one word correctly. Notes that the passage explained the meaning.',
      vague: "Says 'prep means getting ready' without addressing spackle, or guesses without citing context clues.",
      skipped: "No response or 'I don't know.'",
    },
  },
]

async function run() {
  const client = await pool.connect()
  try {
    console.log(`Seeding ${passages.length} Amos-specific ELAR passages (Batch 1b)...\n`)

    let inserted = 0
    let updated = 0
    let failed = 0

    for (const p of passages) {
      const pn = DIFFICULTY_TO_PN[p.difficulty]
      if (!pn) {
        console.error(`  [SKIP] ${p.skill_id} ${p.reading_level}: unknown difficulty "${p.difficulty}"`)
        failed++
        continue
      }
      try {
        // Upsert by (skill, level, pn, interest_tag)
        const result = await client.query(
          `INSERT INTO elar_placement_passages
             (skill_id, reading_level, difficulty, passage_number, passage_text,
              question, answer_key, scoring_rubric, age_appropriate_context, interest_tag)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)
           ON CONFLICT (skill_id, reading_level, passage_number, interest_tag) DO UPDATE SET
             difficulty = EXCLUDED.difficulty,
             passage_text = EXCLUDED.passage_text,
             question = EXCLUDED.question,
             answer_key = EXCLUDED.answer_key,
             scoring_rubric = EXCLUDED.scoring_rubric,
             age_appropriate_context = EXCLUDED.age_appropriate_context
           RETURNING id, xmax = 0 AS inserted`,
          [
            p.skill_id,
            p.reading_level,
            p.difficulty,
            pn,
            p.passage_text,
            p.question,
            p.answer_key,
            JSON.stringify(p.scoring_rubric),
            p.age_appropriate_context,
            AMOS_INTEREST_TAG,
          ]
        )
        if (result.rows[0]?.inserted) {
          inserted++
          console.log(`  [INS amos] ${p.skill_id.padEnd(4)} ${p.reading_level.padEnd(10)} pn=${pn} (${p.difficulty.padEnd(6)}) ← ${p.age_appropriate_context}`)
        } else {
          updated++
          console.log(`  [UPD amos] ${p.skill_id.padEnd(4)} ${p.reading_level.padEnd(10)} pn=${pn} (${p.difficulty.padEnd(6)}) ← ${p.age_appropriate_context}`)
        }
      } catch (err) {
        failed++
        console.error(`  [ERR] ${p.skill_id} ${p.reading_level}: ${err.message}`)
      }
    }

    console.log(`\nDone — inserted: ${inserted}, updated: ${updated}, failed: ${failed}`)

    // Verification: show all Amos-tagged rows
    const verify = await client.query(
      `SELECT skill_id, reading_level, difficulty, passage_number, age_appropriate_context
       FROM elar_placement_passages
       WHERE interest_tag = 'amos'
       ORDER BY reading_level, skill_id`
    )
    console.log(`\nAmos-tagged passages now in table: ${verify.rowCount}`)
    for (const r of verify.rows) {
      console.log(`  ${r.skill_id.padEnd(4)} ${r.reading_level.padEnd(10)} ${r.difficulty.padEnd(6)} pn=${r.passage_number} — ${r.age_appropriate_context}`)
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
