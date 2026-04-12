// INFO-2 task instructions runner
// Applies zone_task_library UPDATEs (jsonb) and task_instructions UPSERTs (text[])
// using parameterized queries so pg handles both types correctly.

import pg from 'pg'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres'
const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })

// ══════════════════════════════════════════════════════════
// zone_task_library UPDATEs — replace generic fallback text
// with specific, product-aware instructions.
//
// Each entry: { ilike: [...text patterns], zone_key?: string,
//   task_type_in?: string[], instructions: string[] }
// ══════════════════════════════════════════════════════════

const zoneUpdates = [
  // ── KITCHEN ──
  {
    ilike: ['%microwave exterior%', '%microwave%door handle%'],
    instructions: [
      'Spray everyday cleaner on a cloth or paper towel — not directly on the machine',
      'Wipe the entire outside: top, sides, front, and door handle',
      'Get the edges around the door where food splatters collect',
      'Check the control panel — wipe gently so buttons stay readable',
    ],
  },
  {
    ilike: ['%cabinet door fronts%', '%cabinet fronts%'],
    instructions: [
      'Spray everyday cleaner on a cloth',
      'Start with the upper cabinets — wipe each door front top to bottom',
      'Then do the lower cabinets — check for fingerprints, smudges, and food drips',
      "Don't forget the handles — grip them and wipe around where fingers touch",
      'Check the cabinet sides if they face out into the room',
    ],
  },
  {
    ilike: ['%outside of fridge%', '%fridge%outside%'],
    instructions: [
      'Spray everyday cleaner on a cloth',
      'Wipe the front of the fridge — door, handles, and the area between the doors',
      "Wipe the sides if they're visible",
      'Check for magnets, papers, or art that need straightening',
      'Wipe the top of the fridge if you can reach it — dust collects up there',
    ],
  },
  {
    ilike: ['%organize%kitchen drawer%'],
    instructions: [
      'Pick ONE drawer to organize today — utensils, junk drawer, or towel drawer',
      'Pull everything out',
      'Wipe inside with a damp cloth',
      'Put back only what belongs — throw away broken or mystery items',
      'Group like items together — spoons with spoons, spatulas with spatulas',
      'Close the drawer. Can you open and close it smoothly? Nothing jamming?',
    ],
  },
  {
    ilike: ['%backsplash%'],
    instructions: [
      'Spray everyday cleaner on the backsplash tiles behind the stove and sink',
      'Wipe each tile — these get grease splatters and food spots',
      'Use a scrub brush on stubborn spots — dried grease needs some elbow grease',
      "Don't forget the grout lines between tiles — they get grimy",
      'Wipe dry so no cleaner drips down onto the counter',
    ],
  },
  {
    ilike: ['%clean toaster%'],
    instructions: [
      'Unplug the toaster first',
      'Pull out the crumb tray on the bottom and dump it in the trash',
      'Wipe the crumb tray clean before putting it back',
      'Wipe the outside of the toaster with everyday cleaner — top, sides, and front',
      'Check around the base where crumbs scatter — wipe that area too',
      'Plug it back in and push it back into its spot',
    ],
  },
  {
    ilike: ['%light switch%'],
    zone_key: 'kitchen_zone',
    instructions: [
      'Spray everyday cleaner on a paper towel — not directly on the switch plate',
      'Wipe every light switch plate in the kitchen — front and edges',
      'Wipe the door handle going into the kitchen',
      'Wipe the pantry door handle if there is one',
      'These are the germiest spots in the house — everyone touches them constantly',
    ],
  },
  {
    ilike: ['%vacuum under%appliance%', '%vacuum%around appliance%'],
    instructions: [
      'Use the regular vacuum with the crevice tool attachment',
      'Vacuum along the base of the fridge — crumbs and dust collect here',
      'Vacuum under the stove if you can reach — pull out the bottom drawer if it has one',
      'Vacuum around the base of the island or any freestanding furniture',
      'Check behind the trash can — food bits fall back there',
      'Put the vacuum away and the crevice tool back in the bag',
    ],
  },
  {
    ilike: ['%baseboard%'],
    zone_key: 'kitchen_zone',
    instructions: [
      'Get a damp cloth with a little everyday cleaner',
      'Start at one wall and work your way around the room',
      'Wipe along the top edge of each baseboard — dust and grease settle here',
      'Look for scuff marks or food splatters — spray directly and wipe harder',
      "Don't forget behind the trash can and under the cabinets where baseboards are hidden",
    ],
  },
  {
    ilike: ['%dish towel%'],
    instructions: [
      'Check the dish towel hanging on the oven handle or hook',
      "If it's damp, smells, or has food stains — pull it off",
      'Toss it in the dirty laundry — not back on the counter',
      'Get a fresh one from the towel drawer and hang it up',
      'One clean towel per day is the goal',
    ],
  },
  {
    ilike: ['%tupperware%'],
    instructions: [
      'Pull everything out of the tupperware cabinet or drawer',
      "Match every lid to its container — if there's no match, set it aside",
      'Stack containers by size — smallest inside largest',
      'Lids can go in a separate basket or stack by size',
      'Throw away any containers that are warped, stained, or cracked — and any lids with no match',
      'Put it all back neatly — you should be able to find what you need without an avalanche',
    ],
  },

  // ── KIDS BATHROOM ──
  {
    ilike: ['%sink faucet%basin%'],
    zone_key: 'kids_bathroom',
    instructions: [
      'Spray everyday cleaner in the sink basin',
      'Scrub the basin with a cloth or sponge — get the sides and the drain area',
      'Scrub the faucet and handles — get into the crevices where gunk builds up',
      'Rinse everything with water',
      'Dry the whole thing with a paper towel or dry cloth — no water spots left',
    ],
  },
  {
    ilike: ['%countertop clear%'],
    zone_key: 'kids_bathroom',
    instructions: [
      'Move everything off the counter — toothbrushes, soap, cups, everything',
      'Spray everyday cleaner across the whole counter surface',
      'Wipe it all down — check for toothpaste globs, soap drips, and sticky spots',
      'Put everything back in its place — neatly, not just shoved back',
      'Dry any wet spots — the counter should be clean AND dry',
    ],
  },
  {
    ilike: ['%hang towels%'],
    zone_key: 'kids_bathroom',
    instructions: [
      'Check every towel in the bathroom — hooks, bars, floor, tub edge',
      'If a towel is on the floor or bunched up, pick it up',
      'Damp or smelly towels go straight to the laundry — do not re-hang them',
      'Fold clean towels in half lengthwise and hang them evenly on the bar or hook',
      "Make sure there's a clean hand towel ready for handwashing",
    ],
  },
  {
    ilike: ['%mirror streak%'],
    zone_key: 'kids_bathroom',
    instructions: [
      'Use GLASS CLEANER only — not the everyday spray (it streaks on mirrors)',
      'Spray the glass cleaner on the mirror or onto a paper towel',
      'Wipe in circles across the whole mirror',
      'Check for toothpaste splatter — especially the bottom half near the sink',
      'Look at it from an angle — any streaks or smudges left? Get them',
      "When you're done, the mirror should look invisible — like there's no glass there",
    ],
  },
  {
    ilike: ['%empty%reline%trash%'],
    zone_key: 'kids_bathroom',
    instructions: [
      'Pull the trash bag out and tie it closed',
      'If the bin is sticky or gross inside — wash it out with hot soapy water and dry it',
      'Put in a new purple small trash bag',
      'Push the bag edges down around the rim so it stays in place',
      'Take the full trash bag to the outside bin',
    ],
  },
  {
    ilike: ['%soap dispenser%toothbrush%'],
    zone_key: 'kids_bathroom',
    instructions: [
      'Pick up the soap dispenser — check the bottom, it gets slimy',
      'Wipe the whole thing down with everyday cleaner — pump, body, and bottom',
      'Pick up the toothbrush holder — gross stuff collects in the holes and at the bottom',
      'Wash it out with hot soapy water — really scrub inside',
      'Dry both and put them back in their spot',
      "Wipe the counter area where they were sitting — it's probably sticky",
    ],
  },
  {
    ilike: ['%light switch%door handle%cabinet%'],
    zone_key: 'kids_bathroom',
    instructions: [
      'Spray everyday cleaner on a paper towel — not directly on the switch',
      'Wipe the light switch plate — front and edges',
      'Wipe the door handle — both sides',
      'Wipe every cabinet handle or knob in the bathroom',
      'These are high-touch areas — everyone grabs them with wet or dirty hands',
    ],
  },
  {
    ilike: ['%organize under.sink%'],
    zone_key: 'kids_bathroom',
    instructions: [
      'Open the cabinet and look — is it a mess?',
      'Pull everything out',
      "Remove anything that doesn't belong in the bathroom",
      'Wipe the inside shelf with everyday cleaner',
      'Group items: cleaning supplies together, personal care together, extra toilet paper together',
      'Put everything back neatly — nothing just shoved in',
      'Wipe the outside of the cabinet doors — check for smudges and fingerprints',
    ],
  },
  {
    ilike: ['%baseboard%'],
    zone_key: 'kids_bathroom',
    instructions: [
      'Get a damp cloth with a little everyday cleaner',
      'Wipe along the baseboard around the entire bathroom',
      'Check behind the toilet — hair and dust collect there',
      'Check along the tub base — water splashes down here',
      'Look for mildew or dark spots — spray directly and scrub if needed',
    ],
  },
  {
    ilike: ['%toilet paper roll%'],
    zone_key: 'kids_bathroom',
    instructions: [
      'Check the toilet paper roll — is it empty or almost empty?',
      "If it's out or down to the last few squares, replace it with a fresh roll",
      'Put the new roll on so the paper comes OVER the top, not under',
      'Check that there\'s at least one spare roll within reach — restock from the cabinet if needed',
      'Throw the empty cardboard tube in the trash or recycling',
    ],
  },

  // ── SCHOOL ROOM ──
  {
    ilike: ['%put away all books%'],
    zone_key: 'school_room',
    instructions: [
      'Walk around the whole school room and dining table area',
      'Collect all loose books and put them back on the correct shelf',
      'Stack papers neatly — homework in the homework spot, art in the art area',
      'Put pens, pencils, and markers back in their containers',
      'Workbooks go back on your personal shelf, not the shared table',
      "Nothing should be left out on the table or floor when you're done",
    ],
  },
  {
    ilike: ['%wipe all table%desk%'],
    zone_key: 'school_room',
    instructions: [
      'Clear the table or desk surface completely first — move everything off',
      'Spray everyday cleaner across the whole surface',
      'Wipe it down — check for pencil marks, eraser shavings, glue spots, and food crumbs',
      'Dry any wet spots',
      "Put back only what belongs on the table — not yesterday's clutter",
    ],
  },
  {
    ilike: ['%push in all chairs%'],
    zone_key: 'school_room',
    instructions: [
      'Push every chair in all the way to the table',
      'Check that no chair is crooked or sticking out where someone could trip',
      'If a chair has stuff on it — move the stuff first, then push it in',
    ],
  },
  {
    ilike: ['%pick up%floor%'],
    zone_key: 'school_room',
    instructions: [
      'Walk the entire room and pick up EVERYTHING on the floor',
      'Papers, books, pencils, crayons, craft scraps — pick it all up',
      "If it's trash, throw it away. If it belongs somewhere, put it there",
      'Check under the table and behind chairs — stuff rolls back there',
      "When you're done, you should be able to walk across the whole room without stepping on anything",
    ],
  },
  {
    ilike: ['%whiteboard%'],
    zone_key: 'school_room',
    instructions: [
      'Use the whiteboard eraser to erase everything (unless Mom said to save it)',
      "If there are old marks that won't erase, use a damp cloth or whiteboard cleaner spray",
      'Wipe the whole board — edges and corners too',
      'Clean the eraser by clapping it outside or wiping it on a paper towel',
      'Put the markers and eraser back in the tray — caps on all markers',
    ],
  },
  {
    ilike: ['%vacuum%rug%', '%vacuum%carpet%'],
    zone_key: 'school_room',
    instructions: [
      'Get the vacuum from the closet — plug it in near the school area',
      'Vacuum the rug or carpet area — push in slow straight lines',
      'Get under the edges of the table and along the walls',
      'If there are small scraps of paper or crayon bits, pick those up by hand first — they can clog the vacuum',
      'Wrap the cord neatly and put the vacuum back',
    ],
  },
  {
    ilike: ['%organize%bookshelf%'],
    zone_key: 'school_room',
    instructions: [
      'Pick ONE section or shelf to organize today — not the whole thing',
      'Pull the books out',
      'Wipe the shelf with a damp cloth',
      'Put books back standing up with spines out — no sideways stacking',
      'Group by type or subject if it makes sense — reading books together, workbooks together',
      'Nothing should be crammed or falling over',
    ],
  },
  {
    ilike: ['%sort%file%paper%'],
    zone_key: 'school_room',
    instructions: [
      'Collect all loose papers from the school room — table, shelves, floor, everywhere',
      'Sort them: keep, recycle, or ask Mom',
      'Keep pile: put in the correct folder, binder, or shelf spot',
      'Recycle pile: put in the recycling bin',
      'Ask Mom pile: set aside in one neat stack for Mom to look through',
    ],
  },
  {
    ilike: ['%art%craft%supplies%'],
    zone_key: 'school_room',
    instructions: [
      'Gather all art and craft supplies — markers, crayons, glue, scissors, paint, everything',
      'Check all markers — cap on, test a quick line, toss any that are dried out',
      'Put all crayons back in the crayon box — broken ones can stay if they still work',
      'Glue sticks: check that caps are on tight. Throw away empty ones',
      'Scissors, tape, rulers — back in their container',
      'Wipe the area where supplies are stored — crayon wax and glue collect there',
    ],
  },
  {
    ilike: ['%dust%windowsill%'],
    zone_key: 'school_room',
    instructions: [
      'Use a damp cloth or duster',
      'Wipe along every windowsill in the school area',
      'Check ledges, shelf tops, and the top of the bookcase',
      'Wipe picture frames if there are any',
      "Shake out or wash the cloth when you're done",
    ],
  },
  {
    ilike: ['%baseboard%'],
    zone_key: 'school_room',
    instructions: [
      'Get a damp cloth with a little everyday cleaner',
      'Start at one wall and work your way around the room',
      'Wipe along the top edge of each baseboard — pencil marks and dust collect here',
      'Check for scuff marks from chairs being pushed back — spray directly and wipe',
    ],
  },
  {
    ilike: ['%light switch%'],
    zone_key: 'school_room',
    instructions: [
      'Spray everyday cleaner on a paper towel',
      'Wipe the light switch plate — front and edges',
      'Wipe the door handle — both sides if applicable',
      "Don't spray directly on the switch — liquid can drip behind the plate",
    ],
  },

  // ── BEDROOMS (all kids) ──
  {
    ilike: ['%pick up floor%nothing on the floor%'],
    instructions: [
      'Walk your entire room and pick up EVERYTHING on the floor',
      'Dirty clothes go in the hamper — not on the chair, not on the bed, the hamper',
      'Trash goes in the trash can',
      'Books, toys, and stuff go back where they belong — shelf, drawer, or bin',
      'Shoes go in your closet or by the door',
      "When you're done, you should see nothing but floor",
    ],
  },
  {
    ilike: ['%dirty laundry in hamper%'],
    instructions: [
      'Check the floor, the bed, the chair, behind the door, and the bathroom',
      'Every piece of dirty clothing goes in your hamper — not next to it, IN it',
      'Socks too — check under the bed',
      "If your hamper is full, it's time for laundry day, not time to pile it on top",
    ],
  },
  {
    ilike: ['%remove any dishes%cups%'],
    instructions: [
      'Look around your whole room — nightstand, desk, floor, windowsill',
      'Collect every dish, cup, glass, bowl, and utensil',
      "Bring them all to the kitchen sink — don't leave them on the counter",
      "Rinse them if they're crusty so they don't stink up the kitchen",
      'No food or drinks live in your room overnight — ever',
    ],
  },
  {
    ilike: ['%under bed%vacuum%'],
    instructions: [
      'Pull everything out from under your bed — all of it',
      'Sort it: keep, trash, or put away somewhere else',
      'Dust bunnies, wrappers, and lost socks will be under there — guaranteed',
      'Vacuum under the entire bed — use the crevice tool to reach the back',
      'Put back ONLY things that belong under there (storage bins, not random junk)',
    ],
  },
  {
    ilike: ['%change bedsheet%', '%change%sheet%'],
    instructions: [
      'Strip your bed completely — fitted sheet, flat sheet, and pillowcases',
      'Toss the dirty sheets in the hamper or straight into the washer',
      'Get a clean set from the linen closet',
      'Put the fitted sheet on first — tuck all four corners tight',
      'Then the flat sheet — straighten it out evenly',
      'Put clean pillowcases on all your pillows',
      'Put your comforter or blanket back on top and smooth it out',
    ],
  },
  {
    ilike: ['%ceiling fan%'],
    instructions: [
      'Turn the fan OFF first',
      'Use a damp cloth or an old pillowcase — slide it over each blade and wipe both sides at once',
      'Dust falls down when you clean fan blades — so do this BEFORE you vacuum the floor',
      'Check all blades — there are usually 4 or 5',
      'If the blades are really dusty, use everyday cleaner on the cloth',
    ],
  },
  {
    ilike: ['%organize%dresser drawer%'],
    instructions: [
      'Pick ONE drawer today — not all of them',
      'Pull everything out',
      'Fold or roll each item neatly',
      'Put back only what fits and what you actually wear',
      'Anything too small, torn, or never worn goes in the donate pile — ask Mom if unsure',
      'Close the drawer. Can you open and close it without fighting it?',
    ],
  },
  {
    ilike: ['%organize%closet%'],
    instructions: [
      'Pick ONE section — hanging clothes, shoes, or shelf area',
      "Pull items out so you can see what you're working with",
      'Hang clothes facing the same direction — grouped by type if possible',
      'Shoes should be paired and on the floor or a shelf — not piled',
      'Put back only what belongs — outgrown clothes go in the donate pile',
      "When you're done, you should be able to see and reach everything easily",
    ],
  },

  // ── DINNER MANAGER ──
  {
    ilike: ['%set out ingredients%', '%ingredients and tools before%'],
    instructions: [
      'Check the meal plan — what are we making tonight?',
      "Pull out all the ingredients you'll need from the fridge and pantry",
      'Set them on the counter so you can see everything',
      "Get out the pots, pans, bowls, and utensils you'll need",
      'If something needs to thaw, check EARLY — not at dinner time',
      'Read the recipe or instructions before you start so you know the order',
    ],
  },
  {
    ilike: ['%wipe cooking surfaces%counters used%'],
    instructions: [
      'Spray everyday cleaner on every counter and surface you used while cooking',
      "Wipe them all down — don't forget the area around the stove",
      'Check for flour, sauce splatters, or crumbs — get them all',
      'Wipe the area where you prepped food — cutting board crumbs, veggie scraps',
      "The kitchen should look like nobody was cooking when you're done",
    ],
  },
  {
    ilike: ['%set the table%dinner%', '%set the table%plates%'],
    instructions: [
      'Count how many people are eating tonight',
      'One plate, one cup, and one set of silverware per person',
      'Plates go in the center of each spot, fork on the left, knife and spoon on the right',
      'Cups go to the upper right of the plate',
      'Napkins go under the fork or next to the plate',
      'If we need serving spoons, set those out in the middle near the food',
    ],
  },
  {
    ilike: ['%put away%leftover%container%'],
    instructions: [
      'Get containers with matching lids — check before you start filling them',
      'Scoop or pour leftovers into the containers',
      'Put the lid on tight',
      "Write what it is and today's date on a piece of tape or label — stick it on",
      "Put it in the fridge — don't leave anything sitting out on the stove or counter overnight",
      'Uncovered food left out overnight is not safe to eat — when in doubt, ask Mom',
    ],
  },
  {
    ilike: ['%put away%cooking%ingredient%tool%'],
    instructions: [
      'Put every ingredient back where it came from — fridge stuff in fridge, pantry stuff in pantry',
      'Close all lids and bags tightly — no open chip bags or uncapped bottles',
      'Put all cooking tools, cutting boards, and utensils in the dishwasher or hand-wash pile',
      'Wipe down any lids or bottles that got messy during cooking',
      "Nothing should be left on the counter when you're done",
    ],
  },

  // ── BELLE CARE ──
  {
    ilike: ['%brush belle%'],
    instructions: [
      'Get the slicker brush from the basket by the door or wherever Mom keeps it',
      'Start at her back and work down to her sides and legs',
      "Be gentle on her belly — she's ticklish there",
      'Brush her tail and the fur behind her ears — tangles hide here',
      'Talk to her while you brush — it keeps her calm',
      "Check for any mats or knots — don't pull hard, work them out gently",
      "When you're done, clean the hair off the brush and throw it away",
    ],
  },
  {
    ilike: ['%note anything unusual%'],
    instructions: [
      "While you're with Belle, look her over quickly",
      'Check her eyes — are they clear or goopy?',
      'Check her ears — do they smell or look dirty inside?',
      'Check her paws — anything stuck between her pads?',
      'Is she limping, scratching a lot, or acting weird?',
      "If ANYTHING seems off, tell Mom right away — don't wait",
    ],
  },
]

// ══════════════════════════════════════════════════════════
// task_instructions UPSERTs — morning/bedtime routines + feature help
// ══════════════════════════════════════════════════════════

const taskInstructions = [
  // Morning routine
  ['routine', 'get_dressed', [
    "Put on clean clothes for today — not yesterday's clothes off the floor",
    'Dirty clothes go in the hamper right now, not later',
    'Check yourself — shirt on straight, pants fit, socks match',
    "If it's a school day for Zoey or Kaylee, check dress code",
  ]],
  ['routine', 'make_bed', [
    'Pull up the fitted sheet and tuck any loose corners back under the mattress',
    'Pull up the flat sheet and straighten it — even on both sides',
    'Pull up the comforter or blanket and smooth it out',
    'Arrange your pillows at the top — standing up or lying flat, just neat',
    "It doesn't have to be perfect — just neat enough that it looks made, not slept in",
  ]],
  ['routine', 'eat_breakfast', [
    'Pick something to eat — cereal, toast, fruit, whatever is available',
    'Sit at the table to eat — not walking around the house with food',
    "When you're done, scrape your plate into the trash and rinse it",
    'Put your dishes in the dishwasher or the breakfast dish pile',
    'Wipe your spot at the table if you left crumbs',
  ]],
  ['routine', 'scrape_rinse_dishes', [
    'Scrape any food off your plate into the trash',
    'Rinse the plate, bowl, cup, and utensils with water',
    "Put them in the dishwasher if it's running, or in the sink for dish duty",
    "Don't leave them on the counter for someone else to deal with",
  ]],
  ['routine', 'put_away_morning', [
    'Look around — did you leave the cereal box out? Milk? Peanut butter?',
    'Put all food items back where they came from — fridge or pantry',
    'Put the butter knife in the sink, not on the counter',
    'Close cabinet doors you opened',
    'Your morning should not leave a trail for someone else to clean up',
  ]],
  ['routine', 'brush_hair_morning', [
    "Start at the bottom of your hair and work up — don't rip through from the top",
    'Use a detangling brush or wide-tooth comb for knots',
    "If it's really tangled, use a little detangler spray",
    "Get the back of your head too — that's where sleep tangles hide",
    "When you're done, no visible knots or rats nests",
  ]],
  ['routine', 'kaylee_lens_clean', [
    'Use a lens cloth — not your shirt (shirts scratch lenses)',
    'Breathe on the lens to fog it up, then wipe in small circles',
    'Check both lenses — hold them up to the light to see smudges',
    "If they're really dirty, rinse under water first, then wipe",
    'Put the lens cloth back in your case so you can find it tomorrow',
  ]],
  ['routine', 'hannah_eczema_cream', [
    'Check your skin — any red, dry, or itchy patches?',
    'Apply cream to any problem areas — elbows, knees, hands, behind your knees',
    "Use a thin layer — you don't need a huge glob",
    'Rub it in gently until it absorbs',
    "If a spot is cracked or really itchy, tell Mom — you might need the stronger cream",
    'This is most important right after your bath while your skin is still damp',
  ]],

  // Bedtime routine
  ['routine', 'pajamas_on', [
    'Change into clean pajamas — not the same ones from three nights ago',
    "Put today's clothes in the hamper — not on the floor, not on the chair",
    'If your pajamas smell or have food on them, get a fresh pair',
  ]],
  ['routine', 'bedroom_floor_clear', [
    'Quick scan of your whole floor — anything out of place?',
    'Clothes in hamper, shoes in closet, trash in trash can',
    'Books and toys back on shelves or in bins',
    'Nothing on the floor that you could step on in the dark',
    'This takes 2 minutes now or 20 minutes tomorrow — your choice',
  ]],
  ['routine', 'device_charged', [
    'Plug your tablet, phone, or device into its charger',
    'Put it in the designated charging spot — NOT in your bed',
    'Devices do not come to bed with you — screens mess up your sleep',
    "If your charger isn't working, tell Mom before you go to bed, not at midnight",
  ]],
  ['routine', 'lay_out_clothes', [
    'Pick out a full outfit for tomorrow — shirt, pants/shorts, underwear, socks',
    "Check the weather if you're not sure what to wear",
    'Lay them out on your dresser or chair — ready to grab in the morning',
    "This saves 15 minutes of morning chaos and 'I have nothing to wear' meltdowns",
  ]],
  ['routine', 'shower_bath', [
    "Check if tonight is your bath night — it's on your schedule",
    'Get your towel and clean pajamas ready BEFORE you get in',
    'Use soap on your whole body — not just standing under the water',
    "Shampoo your hair — lather, rinse, repeat if it's been a while",
    'Rinse everything completely — no soap left anywhere',
    'Dry off completely and put on your clean pajamas',
    "Hang your towel up — don't leave it on the floor",
    'Put dirty clothes in the hamper on your way out',
  ]],
  ['routine', 'brush_hair_bedtime', [
    'Brush your hair before bed — tangles get worse overnight if you skip this',
    'Start at the ends and work up to the roots',
    'Use detangler spray if needed',
    'Get the back and the underneath — sleep tangles form at the nape of your neck',
    'A quick braid or ponytail can help prevent tangles while you sleep',
  ]],
  ['routine', 'wash_hands_bedtime', [
    'Your hands touched door handles, phones, remotes, and your face all day',
    'Warm water, soap, 20 seconds of scrubbing',
    'Get between your fingers and under your nails',
    'Dry with a clean towel',
    'This is the last line of defense before you put your hands on your pillow all night',
  ]],
  ['routine', 'quick_scan_bedtime', [
    'Do a 30-second mental walk-through of your day',
    'Did you leave a cup or plate somewhere outside your room?',
    'Any tissues, wrappers, or trash sitting out?',
    'Bathroom mess from your shower or teeth brushing? Go fix it now',
    'Lights off in rooms you were in',
    "This isn't about perfection — it's about not leaving messes for everyone else to find in the morning",
  ]],

  // Feature help
  ['feature', 'meal_picker', [
    'This is YOUR dinner night — you get to pick what the family eats!',
    'Tap the Shuffle button to get a random meal idea from your theme',
    'Or scroll down and pick from the full list',
    'Once you pick, Mom gets a notification to approve it',
    'After she approves, your meal goes on the family calendar and she adds the ingredients to the grocery list',
    'Pick BEFORE the deadline so Mom has time to shop!',
  ]],
  ['feature', 'homework_turnin', [
    'When you finish a workbook page or assignment, tap the book icon on that task',
    'Enter the page numbers you completed and your score if you have one',
    'This logs your work so Mom can see your progress without asking you',
    'If you did extra pages, log those too — you might earn bonus stars',
  ]],
  ['feature', 'dinner_manager_overview', [
    "You're the Dinner Manager tonight — that means you run the kitchen!",
    "Check the meal plan to see what's for dinner",
    "Get ingredients out and read the recipe or follow Mom's instructions",
    'Set the table before the food is ready — plates, cups, silverware, napkins',
    "Call everyone when it's time to eat",
    'After dinner, your task list below shows exactly what cleanup to do',
  ]],
  ['feature', 'laundry_overview', [
    'Today is your laundry day — you own the whole process start to finish',
    'Collect your dirty clothes from your room and the bathroom',
    'Sort them, wash them, dry them, fold them, and put them away',
    'All of it. Not half. All of it. Done means everything is in a drawer or hung up',
    'Check your task list below for the step-by-step breakdown',
  ]],
]

// ══════════════════════════════════════════════════════════
// Run
// ══════════════════════════════════════════════════════════

async function run() {
  await client.connect()
  let zoneTouched = 0
  let taskUpserted = 0

  // Apply zone_task_library UPDATEs
  for (const u of zoneUpdates) {
    // Build dynamic WHERE with OR of ILIKEs
    const ilikeClauses = u.ilike.map((_, i) => `task_text ILIKE $${i + 1}`).join(' OR ')
    const params = [...u.ilike]
    let sql = `UPDATE zone_task_library SET instructions = $${params.length + 1}::jsonb WHERE (${ilikeClauses})`
    params.push(JSON.stringify(u.instructions))
    if (u.zone_key) {
      params.push(u.zone_key)
      sql += ` AND zone_key = $${params.length}`
    }
    const res = await client.query(sql, params)
    if (res.rowCount > 0) {
      zoneTouched += res.rowCount
      console.log(`  ✓ [${res.rowCount}] ${u.ilike[0]}${u.zone_key ? ' @ ' + u.zone_key : ''}`)
    } else {
      console.log(`  · [0] ${u.ilike[0]}${u.zone_key ? ' @ ' + u.zone_key : ''} (no match)`)
    }
  }

  // Apply task_instructions UPSERTs
  for (const [source, key, steps] of taskInstructions) {
    const res = await client.query(
      `INSERT INTO task_instructions (task_source, task_key, steps)
       VALUES ($1, $2, $3)
       ON CONFLICT (task_source, task_key) DO UPDATE SET steps = EXCLUDED.steps`,
      [source, key, steps]
    )
    if (res.rowCount > 0) taskUpserted++
  }

  console.log(`\n✅ zone_task_library rows updated: ${zoneTouched}`)
  console.log(`✅ task_instructions rows upserted: ${taskUpserted}`)
  await client.end()
}

run().catch(async err => {
  console.error('❌ Error:', err.message)
  try { await client.end() } catch {}
  process.exit(1)
})
