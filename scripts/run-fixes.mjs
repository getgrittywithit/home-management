import pg from 'pg'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres'
const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })

async function run() {
  await client.connect()
  console.log('Connected to database')

  // Fix A: Delete test visit note data
  try {
    const r = await client.query(`DELETE FROM health_visit_notes WHERE LOWER(provider_name) LIKE '%pablo%' OR LOWER(raw_notes) LIKE '%pablo%'`)
    console.log(`Fix A: Deleted ${r.rowCount} test visit note rows`)
  } catch (e) { console.log('Fix A skip:', e.message) }

  // Fix B: Add frequency column
  try {
    await client.query(`ALTER TABLE zone_task_library ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'always'`)
    console.log('Fix B: frequency column added/confirmed')
  } catch (e) { console.log('Fix B column skip:', e.message) }

  // Fix B: Set frequency for weekly/monthly task types
  try {
    const r1 = await client.query(`UPDATE zone_task_library SET frequency = 'weekly' WHERE task_type = 'weekly' AND (frequency IS NULL OR frequency = 'always')`)
    const r2 = await client.query(`UPDATE zone_task_library SET frequency = 'monthly' WHERE task_type = 'monthly' AND (frequency IS NULL OR frequency = 'always')`)
    console.log(`Fix B: Set ${r1.rowCount} weekly, ${r2.rowCount} monthly tasks`)
  } catch (e) { console.log('Fix B freq skip:', e.message) }

  // Fix C: Seed instructions - kitchen
  const instructions = [
    // Kitchen
    { match: '%wipe%counter%', zone: null, text: "Spray the counter with cleaner and wipe with a clean cloth. Start at one end and work across. Don't forget around the toaster and coffee maker. Dry with a paper towel if it's still wet." },
    { match: '%sweep%kitchen%', zone: null, text: "Get the broom and dustpan from the closet. Start at the far wall and sweep toward the center, then toward the dustpan. Make sure to get under the table and chairs. Dump the dustpan in the trash and put everything back." },
    { match: '%dishes%', zone: '%kitchen%', text: "Fill one side of the sink with hot soapy water. Wash dishes starting with glasses, then plates, then pots. Rinse each one and set in the drying rack. Wipe down the sink when you're done." },
    { match: '%trash%', zone: '%kitchen%', text: "Take the trash bag out of the can and tie it closed. Carry it to the outside bin. Put a new trash bag in the kitchen can. If the recycling is full, take that out too." },
    { match: '%microwave%', zone: null, text: "Open the microwave and wipe the inside with a damp cloth and a little cleaner. Don't forget the door and the turntable plate. If there's stuck-on food, heat a cup of water for 1 minute first to loosen it." },
    { match: '%stove%', zone: null, text: "Use a damp cloth with a small amount of cleaner. Wipe the outside of the stove, the knobs, and the area around the burners. If there are drip pans, pull them out and wipe underneath." },
    { match: '%table%', zone: '%kitchen%', text: "Take everything off the table. Spray it with cleaner and wipe it down with a cloth. Wipe the chairs too if they look sticky. Put the centerpiece or napkin holder back when you're done." },
    { match: '%dishwasher%', zone: null, text: "Open the dishwasher and unload clean dishes into the right cabinets and drawers. Stack plates neatly. Put silverware in the organizer. If dishes are dirty, load them properly — plates face the center, cups on top rack upside down." },
    { match: '%unload%', zone: null, text: "Open the dishwasher and unload clean dishes into the right cabinets and drawers. Stack plates neatly. Put silverware in the organizer." },

    // Bathroom
    { match: '%toilet%', zone: null, text: "Spray the toilet with bathroom cleaner — inside the bowl, under the rim, the seat (both sides), the lid, and the base. Use the toilet brush to scrub inside the bowl. Wipe the outside with a paper towel. Flush when done." },
    { match: '%mirror%', zone: null, text: "Spray the mirror with glass cleaner and wipe in big circle motions with a paper towel or lint-free cloth. Start at the top and work down. Make sure there are no streaks." },
    { match: '%sink%', zone: '%bath%', text: "Spray the sink and faucet with cleaner. Scrub the basin with a sponge, especially around the drain. Wipe the faucet handles and the area around the sink. Rinse and dry with a towel so it shines." },
    { match: '%shower%', zone: null, text: "Spray the shower walls and tub with bathroom cleaner. Use a scrub brush or sponge to scrub from top to bottom. Pay attention to the corners and the bottom of the tub. Rinse everything with the showerhead when done." },
    { match: '%tub%', zone: null, text: "Spray the tub with bathroom cleaner. Scrub from top to bottom with a sponge. Pay attention to corners and the drain area. Rinse everything when done." },
    { match: '%towel%', zone: null, text: "Hang up any towels that are on the floor or bunched up. Fold hand towels neatly on the rack. If towels are dirty or smell bad, take them to the laundry hamper and put out fresh ones." },

    // Floors
    { match: '%vacuum%', zone: null, text: "Get the vacuum from the closet. Plug it in and start at the far corner of the room. Push it in slow, straight lines, overlapping each pass slightly. Move furniture and get under edges. When done, wrap the cord neatly and put it back." },
    { match: '%mop%', zone: null, text: "Fill the bucket with warm water and a small squeeze of floor cleaner. Dip the mop, wring it out well (it should be damp, not dripping). Start at the far wall and mop your way toward the door. Let it air dry." },
    { match: '%sweep%', zone: null, text: "Get the broom and dustpan. Start at the far wall and sweep toward the center of the room, then into the dustpan. Check corners and along the baseboards. Dump the dustpan in the trash." },

    // Hotspot / declutter / dust
    { match: '%hotspot%', zone: null, text: "Look at the area and pick up anything that doesn't belong. Put shoes by the door, coats on hooks, papers in the right spot. The goal is to clear the surface so it looks clean and organized." },
    { match: '%declutter%', zone: null, text: "Pick up anything that doesn't belong in this area. Put items back where they go. If you don't know where something goes, set it aside and ask Mom." },
    { match: '%dust%', zone: null, text: "Use a dusting cloth or duster. Start at the top of the furniture and work down. Don't forget shelves, picture frames, lamp bases, and windowsills. Shake out or wash the cloth when you're done." },

    // Pantry
    { match: '%pantry%', zone: null, text: "Open the pantry and check for anything expired or open that shouldn't be. Pull items to the front so labels face out. Group similar things together. Wipe any crumbs off the shelves with a damp cloth." },

    // Pet care: Midnight (bunny)
    { match: '%water%', zone: '%midnight%', text: "Check Midnight's water bottle — if it's less than half full, refill it with fresh water. Make sure the spout isn't clogged by tapping it gently." },
    { match: '%spot clean%', zone: '%midnight%', text: "Scoop out any wet or soiled bedding from the cage. Add a thin layer of fresh bedding to replace what you removed. The cage should smell clean when you're done." },
    { match: '%feed%', zone: '%midnight%', text: "Fill Midnight's food bowl with a small scoop of pellets (about 1/4 cup). Add a handful of fresh hay to the hay rack. If there's leftover wilted veggies, throw those away first." },
    { match: '%food%', zone: '%midnight%', text: "Fill Midnight's food bowl with a small scoop of pellets (about 1/4 cup). Add a handful of fresh hay to the hay rack. Throw away any old veggies first." },
    { match: '%full%clean%', zone: '%midnight%', text: "Take everything out of the cage — bowls, toys, hideout. Remove all the old bedding and throw it away. Wipe the cage bottom with a damp cloth. Add fresh bedding, put everything back, and refill food and water." },
    { match: '%health%check%', zone: '%midnight%', text: "Look at Midnight — are her eyes bright? Is she eating and drinking? Is she moving around normally? Check for any lumps, wet bottom, or overgrown nails. If something looks off, tell Mom right away." },

    // Pet care: Hades (snake)
    { match: '%water%', zone: '%hades%', text: "Check that Hades has fresh water in his bowl. If it's dirty or low, dump it out, rinse the bowl, and refill with clean room-temperature water. Place it back gently so you don't startle him." },
    { match: '%temp%', zone: '%hades%', text: "Look at the temperature and humidity readings on the tank gauges. Warm side should be 88-92°F, cool side 75-80°F. Humidity should be 50-60%. If something is off, tell Mom or Zoey." },
    { match: '%humidity%', zone: '%hades%', text: "Check the humidity gauge on Hades' tank. It should be 50-60%. If it's low, mist the tank lightly with a spray bottle. If it's too high, open the lid a crack for airflow." },
    { match: '%health%check%', zone: '%hades%', text: "Look through the glass at Hades. Is he in his hide? Moving normally? Check for stuck shed skin, cloudy eyes, or anything unusual. If he looks sick or hurt, tell Zoey and Mom immediately." },
    { match: '%spot clean%', zone: '%hades%', text: "Use paper towels to spot-clean any waste in the tank. Remove soiled substrate and replace with a small amount of fresh substrate. Be gentle and move slowly so you don't stress Hades." },

    // Pet care: Spike (bearded dragon)
    { match: '%water%', zone: '%spike%', text: "Check Spike's water dish — dump old water, rinse the dish, and refill with fresh water. You can also mist him lightly with a spray bottle if he looks dry." },
    { match: '%feed%', zone: '%spike%', text: "Offer Spike his salad — dark leafy greens (no iceberg lettuce), with some squash or bell pepper. Put it in his food dish. If it's a bug day, Amos handles the insects." },
    { match: '%food%', zone: '%spike%', text: "Offer Spike his salad — dark leafy greens with some squash or bell pepper. Put it in his food dish. If it's a bug day, Amos handles the insects." },
    { match: '%temp%', zone: '%spike%', text: "Check the tank temps — basking spot should be 100-110°F, cool side 80-85°F. Make sure both UVB and heat lights are on during the day. Tell Amos or Mom if a bulb looks dim." },
    { match: '%light%', zone: '%spike%', text: "Make sure Spike's UVB and basking lights are both on. They should be on during the day and off at night. If a bulb is flickering or out, tell Amos or Mom." },
    { match: '%health%check%', zone: '%spike%', text: "Look at Spike closely. Are his eyes alert? Is his belly a healthy color? Check for stuck shed, black beard (stress), or unusual marks. If something seems wrong, tell Amos and Mom." },
    { match: '%spot clean%', zone: '%spike%', text: "Remove any poop or soiled spots from the tank with a paper towel. If the substrate looks messy, scoop out the dirty part and add fresh. Quick and easy — just keep it clean." },
    { match: '%bath%', zone: '%spike%', text: "Fill the bath container with about half an inch of warm water (not hot — test with your wrist). Gently place Spike in. Let him soak for 10-15 minutes. Watch him the whole time. Pat dry with a soft towel when done." },

    // Pet care: Belle (dog)
    { match: '%water%', zone: '%belle%', text: "Check Belle's water bowl — if it's less than half full or looks dirty, dump it, rinse the bowl, and refill with fresh cold water. She should always have clean water available." },
    { match: '%feed%', zone: '%belle%', text: "Scoop Belle's food into her bowl — the right amount is marked on the food bag for her weight. Set it down in her feeding spot. Make sure she eats calmly. Pick up the bowl when she's done." },
    { match: '%food%', zone: '%belle%', text: "Scoop Belle's food into her bowl — the right amount is on the food bag. Set it in her feeding spot. Pick up the bowl when she's done." },
    { match: '%walk%', zone: '%belle%', text: "Take Belle outside on her leash. Let her walk, sniff, and do her business. Bring a poop bag. Walk for at least 10-15 minutes. If she pulls, stop and wait until the leash is loose before walking again." },
    { match: '%poop%', zone: '%belle%', text: "Walk through the yard with a bag and pick up all of Belle's poop. Check the whole yard, not just the obvious spots. Tie the bag closed and throw it in the outside trash." },
    { match: '%brush%', zone: '%belle%', text: "Use the brush Mom keeps by Belle's stuff. Brush her coat gently, following the direction the fur grows. Spend about 5 minutes. This keeps her coat healthy and she loves the attention." },

    // Laundry room
    { match: '%wash%', zone: '%laundry%', text: "Sort your dirty clothes into lights and darks. Load one pile into the washer — don't overfill it. Add detergent to the dispenser. Set to the right cycle and press start." },
    { match: '%dryer%', zone: '%laundry%', text: "Move the wet clothes from the washer to the dryer. Shake each item out before tossing it in. Clean the lint trap first. Set the dryer to medium heat and press start." },
    { match: '%fold%', zone: '%laundry%', text: "Take the dry clothes out of the dryer. Fold each item neatly — shirts flat then in half, pants in thirds, towels in thirds. Stack by type. Carry them to your room and put them away." },
    { match: '%lint%', zone: '%laundry%', text: "Pull the lint trap out of the dryer. Peel off all the lint and throw it in the trash. Slide the trap back in. This should be done every single time before running the dryer." },

    // Bedtime/morning routine common tasks
    { match: '%teeth%', zone: null, text: "Put toothpaste on your toothbrush. Brush for two full minutes — top teeth, bottom teeth, front and back. Spit, rinse your mouth, and rinse your toothbrush. Put it back in the holder." },
    { match: '%bed%made%', zone: null, text: "Pull the sheets and blankets up flat. Smooth out any wrinkles. Put your pillow at the top. If you have stuffed animals, arrange them neatly. A made bed makes the whole room look better." },
    { match: '%make%bed%', zone: null, text: "Pull the sheets and blankets up flat. Smooth out any wrinkles. Put your pillow at the top. A made bed makes the whole room look better and starts the day right." },
    { match: '%pick up%room%', zone: null, text: "Walk around your room and pick up anything on the floor that doesn't belong there. Dirty clothes go in the hamper, toys go on shelves, trash goes in the trash can. Clear surfaces too." },
    { match: '%dirty clothes%', zone: null, text: "Gather all your dirty clothes from today — check the floor, your bed, and the bathroom. Put them in your laundry hamper. Don't leave socks hiding under the bed." },
  ]

  let totalUpdated = 0
  for (const inst of instructions) {
    try {
      let q, params
      const jsonText = JSON.stringify(inst.text)
      if (inst.zone) {
        q = `UPDATE zone_task_library SET instructions = $1::jsonb WHERE LOWER(task_text) LIKE $2 AND zone_key LIKE $3 AND instructions IS NULL`
        params = [jsonText, inst.match, inst.zone]
      } else {
        q = `UPDATE zone_task_library SET instructions = $1::jsonb WHERE LOWER(task_text) LIKE $2 AND instructions IS NULL`
        params = [jsonText, inst.match]
      }
      const r = await client.query(q, params)
      if (r.rowCount > 0) {
        totalUpdated += r.rowCount
        console.log(`  Updated ${r.rowCount} tasks matching "${inst.match}"`)
      }
    } catch (e) { console.log(`  Skip ${inst.match}: ${e.message}`) }
  }

  // Catch-all for remaining NULL instructions
  try {
    const catchAllText = JSON.stringify("Look at this task carefully and do your best. If you're not sure how to do it, ask Mom or check with a sibling who has done it before. Take your time and do it right.")
    const r = await client.query(
      `UPDATE zone_task_library SET instructions = $1::jsonb WHERE instructions IS NULL AND task_text IS NOT NULL`,
      [catchAllText]
    )
    totalUpdated += r.rowCount
    console.log(`Fix C: Catch-all updated ${r.rowCount} remaining tasks. Total: ${totalUpdated}`)
  } catch (e) { console.log('Fix C catch-all skip:', e.message) }

  console.log('All fixes applied!')
  await client.end()
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
