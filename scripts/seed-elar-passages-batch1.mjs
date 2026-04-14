// Seed ELAR placement passages — Batch 1 (20 passages)
// Replaces the generic AI stubs in (skill_id, reading_level, passage_number) slots
// with Lola's high-quality topic-matched content tailored to the kids' interests.
// Mapping: difficulty → passage_number (easy=1, medium=2, hard=3).
// Batch 1 of ~9 — see dispatch for full seed plan.

import pg from 'pg'

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

const DIFFICULTY_TO_PN = { easy: 1, medium: 2, hard: 3 }

const passages = [
  // LEVEL: 2nd-3rd Grade (Hannah + Amos functional)
  {
    skill_id: 'R1',
    reading_level: '2nd-3rd',
    difficulty: 'easy',
    age_appropriate_context: 'Growing tomatoes — Hannah garden interest',
    passage_text:
      "Tomato plants need a few important things to grow big and strong. First, they need sunlight. Tomato plants love warm, sunny spots. They also need water, but not too much — soggy soil can hurt the roots. Good soil with nutrients helps the plant grow tall. If you give a tomato plant these three things, you will see little yellow flowers. Those flowers turn into green tomatoes. Then, with more sun and time, the green tomatoes turn red. That is when they are ready to pick and eat!",
    question: 'What is the main idea of this passage? What three things does a tomato plant need to grow?',
    answer_key:
      'The main idea is that tomato plants need sunlight, water, and good soil to grow. With these three things, the plant will flower and eventually produce red tomatoes that are ready to eat.',
    scoring_rubric: {
      detailed:
        'Names all three needs (sunlight, water, soil/nutrients) AND states the main idea about what plants need to grow. May reference the growth cycle (flowers → green → red).',
      adequate: 'Names at least two of the three needs and gives a general main idea about growing plants.',
      vague: "Mentions one need or says 'plants need stuff to grow' without specifics.",
      skipped: "No response or 'I don't know.'",
    },
  },
  {
    skill_id: 'R5',
    reading_level: '2nd-3rd',
    difficulty: 'easy',
    age_appropriate_context: 'Baking cookies — Hannah cooking interest',
    passage_text:
      "Maya wanted to bake cookies for her dad's birthday. She had never baked by herself before. She read the recipe three times. She measured the flour very carefully. When she cracked the egg, a piece of shell fell in. She almost cried. But she used a spoon to scoop the shell out and kept going. The cookies came out a little flat, but her dad smiled so big when he tasted one. \"These are the best cookies I've ever had,\" he said. Maya knew they weren't perfect, but she felt proud anyway.",
    question: "What lesson does this story teach? Why did Maya feel proud even though the cookies weren't perfect?",
    answer_key:
      "The theme/lesson is that trying your best matters more than being perfect. Maya felt proud because she did it herself and made her dad happy, even though the cookies were flat and she made a mistake with the egg shell.",
    scoring_rubric: {
      detailed:
        "Identifies the theme as 'trying your best matters more than being perfect' or 'effort counts.' Explains Maya's pride came from doing it herself and making her dad happy despite imperfection.",
      adequate: "General idea about trying hard or not giving up. Mentions Maya's dad being happy.",
      vague: "Says 'she was happy' or 'the cookies were good' without connecting to the lesson.",
      skipped: "No response or 'I don't know.'",
    },
  },
  {
    skill_id: 'R10',
    reading_level: '2nd-3rd',
    difficulty: 'medium',
    age_appropriate_context: 'Walk-in freezer mystery',
    passage_text:
      "Carlos put on his thick gloves and pulled the heavy door open. Cold air rushed out and hit his face. He could see his breath. Rows and rows of boxes sat on metal shelves. Some boxes had ice crystals on top. Carlos checked his list and found the box he needed on the third shelf. He grabbed it quickly and hurried back out, slamming the heavy door behind him. He rubbed his arms to warm up.",
    question: 'Where is Carlos? How do you know? Use clues from the passage to support your answer.',
    answer_key:
      'Carlos is inside a walk-in freezer (or large refrigerator/cold storage). Clues: thick gloves, cold air, seeing his breath, ice crystals on boxes, heavy door, rubbing his arms to warm up.',
    scoring_rubric: {
      detailed:
        'Identifies the location as a freezer or cold storage room. Cites 2+ specific text clues (cold air, ice crystals, seeing breath, gloves, heavy door).',
      adequate: 'Identifies it as a cold place or freezer. Mentions at least one clue.',
      vague: "Says 'somewhere cold' without citing specific evidence from the text.",
      skipped: "No response or 'I don't know.'",
    },
  },
  {
    skill_id: 'R4',
    reading_level: '2nd-3rd',
    difficulty: 'easy',
    age_appropriate_context: "Bunny's daily routine — Midnight the bunny",
    passage_text:
      "Bunny woke up in his cage and stretched his long ears. First, his owner filled his water bottle with fresh, cool water. Then she put a pile of soft hay in his corner. After that, she opened the cage door and let Bunny hop around the living room. Bunny zoomed across the floor and did a big jump called a binky. He explored behind the couch and found a dust bunny that looked like a tiny version of himself. Finally, his owner scooped him up and put him back in his clean cage for a nap.",
    question: 'List the things that happened to Bunny in order, from first to last. What happened after he got out of his cage?',
    answer_key:
      'First, the owner filled his water. Then she added hay. Then she let him out. He hopped around, did a binky, explored behind the couch, and found a dust bunny. Finally, he was put back in his cage for a nap.',
    scoring_rubric: {
      detailed:
        'Lists 4+ events in correct order. Mentions both the care routine (water, hay) AND the exploration (binky, dust bunny). Uses sequence words.',
      adequate: 'Lists 3+ events in mostly correct order. Covers either the care or the exploration part.',
      vague: 'Mentions 1-2 events or gets the order wrong.',
      skipped: "No response or 'I don't know.'",
    },
  },
  {
    skill_id: 'R9',
    reading_level: '2nd-3rd',
    difficulty: 'medium',
    age_appropriate_context: 'Garden watering — Hannah plant interest',
    passage_text:
      "The garden was withering in the August heat. The leaves hung low and looked crispy at the edges. Hannah poured water from the big green can, but the soil soaked it up instantly, like a sponge. \"These poor plants are parched,\" she said. She decided to water them again in the evening when the sun went down, so the water wouldn't evaporate so fast.",
    question: 'What does the word "parched" mean in this passage? What clues in the text helped you figure it out?',
    answer_key:
      '"Parched" means very dry or extremely thirsty. Clues: the garden is withering in heat, leaves are crispy, soil soaks up water instantly, and Hannah decides to water again because the water evaporates.',
    scoring_rubric: {
      detailed:
        "Defines 'parched' as very dry/thirsty AND cites 2+ context clues from the passage (withering, crispy leaves, soil soaking water, evaporation).",
      adequate: "Defines 'parched' as dry or thirsty. Mentions at least one context clue.",
      vague: "Says 'the plants need water' without defining the word or citing clues.",
      skipped: "No response or 'I don't know.'",
    },
  },

  // LEVEL: 4th-5th Grade (Wyatt)
  {
    skill_id: 'R2',
    reading_level: '4th-5th',
    difficulty: 'easy',
    age_appropriate_context: 'Lego building — Wyatt interest',
    passage_text:
      "Jake stared at the massive pile of Lego pieces spread across his bedroom floor. His little sister had knocked over the castle he'd been building for three days. His face got hot and his fists clenched. He wanted to yell. Instead, he took a deep breath, walked to the kitchen, and poured himself a glass of water. When he came back, his sister was sitting on the floor trying to stick two pieces together. \"That one goes here,\" Jake said quietly, sitting down next to her. They started rebuilding together.",
    question: 'What kind of person is Jake? Use details from the story to describe his character.',
    answer_key:
      'Jake is patient and self-controlled. Even though he was angry (face got hot, fists clenched, wanted to yell), he chose to calm himself down (deep breath, glass of water) and then helped his sister rebuild instead of getting mad at her.',
    scoring_rubric: {
      detailed:
        'Identifies 2+ character traits (patient, kind, self-controlled) with specific text evidence showing both his anger AND his choice to calm down and help.',
      adequate: 'Identifies at least one trait (nice, patient, kind) with some evidence from the text.',
      vague: "Says 'he was nice' or 'he helped' without citing how he managed his anger first.",
      skipped: "No response or 'I don't know.'",
    },
  },
  {
    skill_id: 'R7',
    reading_level: '4th-5th',
    difficulty: 'medium',
    age_appropriate_context: 'Bearded dragon behavior — Spike the pet',
    passage_text:
      "Did you know that a bearded dragon can wave? It's true! When a bearded dragon slowly raises one front leg and moves it in a circle, it's actually communicating. Scientists believe the wave is a sign of submission — the dragon is saying \"I see you, and I'm not a threat.\" Baby bearded dragons wave more often than adults. They also bob their heads up and down, which means the opposite: \"I'm the boss here.\" If you own a bearded dragon, pay attention to these signals. Understanding your pet's body language helps you take better care of it.",
    question: "What is the author's purpose in writing this passage? Is the author trying to entertain, inform, or persuade? How can you tell?",
    answer_key:
      "The author's purpose is to inform. The passage teaches facts about bearded dragon behavior (waving means submission, head-bobbing means dominance), uses scientific language (\"scientists believe\"), and ends with practical advice about understanding your pet.",
    scoring_rubric: {
      detailed:
        "Correctly identifies 'inform' as the purpose. Explains WHY using 2+ pieces of evidence (factual content, scientific language, practical advice, teaching tone).",
      adequate: "Correctly identifies 'inform' with at least one reason.",
      vague: "Names a purpose but can't explain why, or picks the wrong purpose with weak reasoning.",
      skipped: "No response or 'I don't know.'",
    },
  },
  {
    skill_id: 'R6',
    reading_level: '4th-5th',
    difficulty: 'easy',
    age_appropriate_context: 'Bubble disaster — funny scene',
    passage_text:
      "I could not believe what I was seeing. The entire backyard was covered in bubbles. Thousands of them. My little brother stood in the middle of it all, holding Mom's biggest mixing bowl and a bent wire hanger. He had used an entire bottle of dish soap. I wanted to be mad, but honestly? It was the most amazing thing I had ever seen. The bubbles floated up past the fence, past the trees, and into the blue sky. I grabbed my phone and started recording. Mom was going to either love this or ground us both.",
    question: 'From whose point of view is this story told? How do you know? What clue words show the point of view?',
    answer_key:
      'The story is told from first-person point of view. Clue words: "I could not believe," "my little brother," "I wanted to be mad," "I grabbed my phone." The narrator is a character in the story telling it from their own perspective.',
    scoring_rubric: {
      detailed:
        "Identifies first-person POV correctly. Cites 2+ 'I/my/me' clue words from the text. Explains that the narrator is a character in the story.",
      adequate: 'Identifies first-person. Mentions at least one clue word.',
      vague: "Says 'someone is telling it' without naming the POV type or citing clues.",
      skipped: "No response or 'I don't know.'",
    },
  },
  {
    skill_id: 'R11',
    reading_level: '4th-5th',
    difficulty: 'medium',
    age_appropriate_context: 'Minecraft vs Lego — Wyatt interests',
    passage_text:
      "Minecraft and Lego have a lot in common. Both let you build anything you can imagine using small blocks. Both come in creative mode, where you build freely, and survival mode, where you gather resources and face challenges. The biggest difference is that Minecraft is digital — you build on a screen — while Lego is physical, something you hold in your hands. Another difference is cost: one Minecraft account costs about ten dollars, but a large Lego set can cost over a hundred. Some kids prefer the feel of real bricks clicking together. Others love that Minecraft worlds have no size limit. Either way, both are tools for creativity.",
    question: 'How are Minecraft and Lego similar? How are they different? Give at least two similarities and two differences.',
    answer_key:
      'Similarities: Both use blocks to build, both have creative and survival/challenge modes. Differences: Minecraft is digital/on-screen while Lego is physical/hands-on, and Minecraft is cheaper (~$10) while large Lego sets are expensive (~$100+). Both are tools for creativity.',
    scoring_rubric: {
      detailed:
        'Lists 2+ similarities AND 2+ differences with specific details from the text (block-building, modes, digital vs physical, cost). May note the concluding shared theme of creativity.',
      adequate: 'Lists at least 1 similarity and 1 difference with some text support.',
      vague: "Says 'they're both fun' or 'one is real and one isn't' without specific details.",
      skipped: "No response or 'I don't know.'",
    },
  },
  {
    skill_id: 'R3',
    reading_level: '4th-5th',
    difficulty: 'easy',
    age_appropriate_context: 'Texas Hill Country trail — local setting',
    passage_text:
      "The trail wound through the Hill Country like a brown ribbon. Cedar trees grew thick on both sides, and the air smelled sharp and clean, like Christmas. A creek trickled over smooth rocks at the bottom of the hill. White-tailed deer prints dotted the mud along the bank. Somewhere above, a red-tailed hawk circled in the wide blue sky. The only sounds were boots crunching on gravel and the wind rustling through the live oak leaves.",
    question: 'Describe the setting of this passage. Where and when do you think this takes place? What details help you picture it?',
    answer_key:
      'The setting is a nature trail in the Texas Hill Country. Details: cedar trees, live oaks, Hill Country mentioned, white-tailed deer, red-tailed hawk, creek, gravel trail. It seems to be daytime (blue sky, hawk circling) and likely fall or winter (cedar smelling like Christmas).',
    scoring_rubric: {
      detailed:
        'Identifies Hill Country/Texas outdoor setting with 3+ sensory details (smell of cedar, sound of boots/wind, sight of deer prints/hawk). May infer season or time of day.',
      adequate: 'Identifies it as an outdoor trail/nature setting with at least 2 details.',
      vague: "Says 'outside' or 'in the woods' without citing specific descriptive details.",
      skipped: "No response or 'I don't know.'",
    },
  },

  // LEVEL: 6th-8th Grade (Ellie)
  {
    skill_id: 'R5',
    reading_level: '6th-8th',
    difficulty: 'medium',
    age_appropriate_context: 'Kid business at farmers market — Ellie business mind',
    passage_text:
      "Mira had been selling bracelets at the farmers' market every Saturday for six weeks. The first week, she sold two. The second week, she rearranged her display and sold five. By the fourth week, she was experimenting with new bead colors based on what customers asked for. She kept a notebook where she tracked every sale, every compliment, and every bracelet someone picked up but put back down. \"The put-backs teach me more than the sales,\" she told her mom. By the sixth week, she had earned enough to buy the jewelry-making kit she'd been eyeing — but more importantly, she had learned that listening to customers was the real skill behind every successful business.",
    question: 'What is the theme of this passage? What does Mira learn that goes beyond just making money?',
    answer_key:
      'The theme is that success in business comes from listening, observing, and adapting — not just from working hard. Mira learns that paying attention to customers (tracking put-backs, adjusting colors) is more valuable than just selling. The deeper lesson is that curiosity and willingness to learn from feedback drive growth.',
    scoring_rubric: {
      detailed:
        "Identifies theme as learning from feedback/listening/adapting. Connects Mira's notebook tracking (especially put-backs) to the deeper business lesson. Notes that the theme goes beyond money to the skill of observation.",
      adequate: "Identifies a general theme about learning or working hard. Mentions Mira's tracking or customer focus.",
      vague: "Says 'she worked hard and made money' without recognizing the listening/adaptation theme.",
      skipped: "No response or 'I don't know.'",
    },
  },
  {
    skill_id: 'R10',
    reading_level: '6th-8th',
    difficulty: 'medium',
    age_appropriate_context: 'Anticipation letter — emotional arc',
    passage_text:
      "The letter had been sitting on the kitchen counter for three days. Every morning, Deja walked past it, glanced at the return address, and kept walking. Her mother had asked twice if she was going to open it. \"Maybe later,\" Deja said both times, her voice careful and flat. On the fourth morning, she finally picked it up. Her hands shook slightly as she slid her finger under the seal. She read the first line, closed her eyes, and let out a breath she didn't know she'd been holding. Then she read it again. A slow smile spread across her face.",
    question: 'What can you infer about the letter? What was Deja feeling before she opened it, and how did her feelings change? Use text evidence.',
    answer_key:
      'The letter likely contained news Deja was anxious about — possibly an acceptance, test result, or important decision. Before opening: she was nervous/afraid (avoided it for 3 days, careful flat voice, shaking hands). After: she was relieved and happy (let out a held breath, slow smile). The news was good.',
    scoring_rubric: {
      detailed:
        'Infers the letter contained important/anticipated news (acceptance, result). Tracks emotional arc from avoidance/anxiety to relief/happiness using 3+ text clues (3 days avoiding, shaking hands, held breath, smile).',
      adequate: 'Recognizes she was nervous before and happy after. Mentions at least 2 text clues.',
      vague: "Says 'she was scared then happy' without citing specific evidence.",
      skipped: "No response or 'I don't know.'",
    },
  },
  {
    skill_id: 'R8',
    reading_level: '6th-8th',
    difficulty: 'easy',
    age_appropriate_context: 'How to start a kid business — Ellie entrepreneurship',
    passage_text:
      "**How to Start a Small Business as a Kid**\n\n*Step 1: Find Your Thing.* What are you good at? What do people ask you to make or do? Start there.\n\n*Step 2: Know Your Costs.* Write down everything you need to buy. Subtract that from what you plan to charge. The difference is your profit.\n\n*Step 3: Test It Small.* Don't make 100 bracelets before you know if anyone wants one. Make 10. Sell them. Learn.\n\n*Step 4: Track Everything.* Use a notebook or a spreadsheet. Write down what you sold, when, and for how much. This data is gold.\n\n> \"The best businesses solve a problem someone actually has.\" — Common business advice",
    question: 'What text features does the author use in this passage? How do these features help the reader understand the information?',
    answer_key:
      'Text features include: bold title/heading, italicized step labels (Step 1-4), numbered sequence, a block quote at the end. These help by organizing the information into clear steps, making it easy to follow in order, and highlighting the key advice at the end.',
    scoring_rubric: {
      detailed:
        'Identifies 3+ text features (bold heading, italicized steps, numbered sequence, block quote) AND explains how each helps the reader (organization, clarity, emphasis, easy to follow).',
      adequate: '2+ text features identified with a general explanation of how they help.',
      vague: "Names one feature or says 'it's organized' without specifying which features do the organizing.",
      skipped: "No response or 'I don't know.'",
    },
  },
  {
    skill_id: 'R2',
    reading_level: '6th-8th',
    difficulty: 'hard',
    age_appropriate_context: 'Quiet leader with anxiety',
    passage_text:
      "Nadia always sat in the back row. Not because she didn't care — she cared too much. She knew every answer but wouldn't raise her hand because the thought of everyone turning to look at her made her stomach flip. When the teacher called on her directly, her answers were always right, and always quiet. After school, she ran the coding club with twelve members, organized the food drive that collected 300 cans, and designed the yearbook cover that won the student vote. Her best friend once said, \"Nadia could lead a whole country, as long as nobody watched her do it.\"",
    question: "Analyze Nadia's character. What internal conflict does she experience? How does her friend's quote reveal something important about her?",
    answer_key:
      "Nadia is highly capable and a natural leader (coding club, food drive, yearbook), but she struggles with anxiety or self-consciousness about being noticed. Her internal conflict is between her ability and her discomfort with visibility. Her friend's quote captures this perfectly — Nadia is a leader who doesn't want the spotlight, revealing that confidence and public comfort are different from competence.",
    scoring_rubric: {
      detailed:
        "Identifies the internal conflict (ability vs. anxiety about being watched). Analyzes the friend's quote as revealing the gap between competence and public confidence. Cites specific accomplishments (coding club, food drive, yearbook) as evidence of leadership despite shyness.",
      adequate: "Recognizes Nadia is smart but shy. Understands the friend's quote generally. Mentions some accomplishments.",
      vague: "Says 'she's shy' without exploring the conflict or analyzing the quote.",
      skipped: "No response or 'I don't know.'",
    },
  },
  {
    skill_id: 'R1',
    reading_level: '6th-8th',
    difficulty: 'medium',
    age_appropriate_context: 'Creativity as a muscle — growth mindset',
    passage_text:
      "Most people think creativity is something you either have or you don't — like a talent you're born with. But research tells a different story. Studies show that creativity works more like a muscle. The more you use it, the stronger it gets. People who practice creative thinking every day — whether through art, writing, building, problem-solving, or even daydreaming — actually develop stronger neural connections in the parts of their brain responsible for generating new ideas. The key isn't waiting for inspiration to strike. It's showing up every day and making something, even when it feels like nothing good is coming. Over time, the \"nothing good\" days become the foundation for the breakthrough days.",
    question: 'What is the main idea of this passage? How does the author challenge a common belief about creativity?',
    answer_key:
      "The main idea is that creativity is a skill you develop through practice, not an inborn talent. The author challenges the common belief that you're either \"creative or not\" by presenting research showing creativity strengthens like a muscle with daily use. The key message is that consistent practice (even on bad days) builds the foundation for breakthroughs.",
    scoring_rubric: {
      detailed:
        "States main idea (creativity is practiced, not inborn). Identifies the common misconception being challenged. References the muscle metaphor and the importance of showing up on 'nothing good' days as building blocks.",
      adequate: 'Captures the general idea that creativity improves with practice. Mentions the common belief being challenged.',
      vague: "Says 'creativity is good' or 'you should be creative' without addressing the practice vs. talent argument.",
      skipped: "No response or 'I don't know.'",
    },
  },

  // LEVEL: 9th-10th Grade (Amos grade-level)
  {
    skill_id: 'R5',
    reading_level: '9th-10th',
    difficulty: 'medium',
    age_appropriate_context: 'Self-taught welder trades — Levi real world',
    passage_text:
      "Marcus learned to weld at sixteen, not because anyone told him to, but because the fence around his grandmother's yard was falling apart and she couldn't afford to hire someone. He watched videos online, borrowed a welder from a neighbor, and burned through three pairs of gloves before he got his first clean bead. By the time he finished the fence, he'd also fixed the neighbor's gate, a broken bicycle frame, and a cracked engine mount on his uncle's truck. Word got around. By seventeen, Marcus had a waiting list. His school counselor kept asking about college plans. Marcus would shrug and say, \"I'm already working.\" What he didn't say was that he'd learned something most classrooms couldn't teach: when you solve a real problem with your own two hands, people remember your name.",
    question: "What theme does this passage develop? How does Marcus's experience challenge traditional ideas about education and success?",
    answer_key:
      "The theme is that practical skills and real-world problem-solving can be just as valuable as formal education. Marcus's experience challenges the assumption that college is the only path to success — he built a reputation and a business by teaching himself a trade and solving real problems in his community. The deeper theme is that initiative, resourcefulness, and hands-on work earn respect and opportunity.",
    scoring_rubric: {
      detailed:
        "Identifies the theme of practical skills vs. formal education. Analyzes how Marcus's self-taught path challenges the counselor's college expectation. Connects to broader ideas about initiative, community value, and defining success differently. References the final line about solving real problems.",
      adequate: 'Recognizes the theme is about hands-on work being valuable. Notes the contrast with school/college expectations.',
      vague: "Says 'he learned to weld' or 'hard work pays off' without addressing the education/traditional success challenge.",
      skipped: "No response or 'I don't know.'",
    },
  },
  {
    skill_id: 'R10',
    reading_level: '9th-10th',
    difficulty: 'hard',
    age_appropriate_context: 'Family tension through silence',
    passage_text:
      "The house had been quiet for three hours — the kind of quiet that happens when everyone is trying not to make noise. Dad was in the garage with the door closed. Mom was reading in the bedroom, but she hadn't turned a page since dinner. Lia sat on the back porch with her headphones in, music off, watching the fireflies pulse in the dark yard. Her little brother came outside, sat next to her without speaking, and leaned against her shoulder. She put her arm around him. They stayed like that until the porch light clicked on automatically at ten, breaking the spell. Neither of them went inside right away.",
    question: 'What can you infer is happening in this family? What specific details suggest something is wrong, even though the author never states it directly?',
    answer_key:
      "Something upsetting has happened in the family — likely a serious argument or bad news. Evidence: the deliberate silence (\"trying not to make noise\"), family members physically separated (Dad in garage, Mom pretending to read, kids outside), Mom not turning pages (distracted/upset), Lia wearing headphones with no music (withdrawing but still alert), the brother seeking comfort silently, neither wanting to go back inside. The author uses physical distance and pretend-normal behavior to show emotional tension.",
    scoring_rubric: {
      detailed:
        "Infers family conflict or crisis. Cites 4+ specific details as evidence (deliberate silence, separation, unturned pages, headphones with no music, brother seeking comfort, reluctance to go inside). Analyzes the author's technique of showing tension through physical actions rather than stating emotions.",
      adequate: 'Infers something is wrong. Cites 2-3 details. Notes the family seems upset or distant.',
      vague: "Says 'something bad happened' without citing specific text evidence.",
      skipped: "No response or 'I don't know.'",
    },
  },
  {
    skill_id: 'R7',
    reading_level: '9th-10th',
    difficulty: 'medium',
    age_appropriate_context: 'Repair vs replace culture',
    passage_text:
      "Every year, thousands of perfectly usable tools, appliances, and pieces of furniture end up in landfills — not because they are broken beyond repair, but because their owners didn't know how to fix them. A cracked handle, a blown fuse, a stripped screw. Problems that would take a skilled person ten minutes to solve become reasons to throw the whole thing away. We have become a society that replaces instead of repairs. This isn't just wasteful — it's expensive. Learning to fix what you own is one of the most financially powerful skills a person can develop. A basic toolkit and a willingness to learn can save a household thousands of dollars a year and keep tons of waste out of the ground.",
    question: "What is the author's purpose? Is the author primarily informing, persuading, or entertaining? What techniques does the author use to achieve that purpose?",
    answer_key:
      "The author's purpose is to persuade readers that learning repair skills is important. Techniques: emotional language (\"perfectly usable,\" \"wasteful\"), statistics (\"thousands\"), contrast (replace vs. repair), financial argument (save thousands), environmental argument (waste out of the ground), and a call to action (learn to fix, get a toolkit).",
    scoring_rubric: {
      detailed:
        "Identifies 'persuade' as primary purpose. Names 3+ persuasive techniques (emotional language, statistics, contrast, financial appeal, environmental appeal, call to action). May note the passage also informs but persuasion is the primary goal.",
      adequate: "Identifies 'persuade' with 1-2 techniques named.",
      vague: "Picks the wrong purpose or says 'persuade' without explaining any techniques.",
      skipped: "No response or 'I don't know.'",
    },
  },
  {
    skill_id: 'R4',
    reading_level: '9th-10th',
    difficulty: 'easy',
    age_appropriate_context: 'Deck repair job — trades Triton world',
    passage_text:
      "The job seemed simple enough: replace the rotten boards on Mrs. Chen's back deck. Leo showed up at eight, measured twice, and pulled the first board. Underneath, he found water damage that had spread to the joists. He called his boss. His boss said to document everything with photos, explain the situation to the homeowner, and get approval before doing any extra work. Leo took twelve photos, sat down with Mrs. Chen over coffee, and walked her through what he'd found. She appreciated his honesty. She approved the extra work. By the end of the week, the deck was rebuilt properly — joists and all — and Mrs. Chen had already recommended Leo to two of her neighbors.",
    question: 'Retell the key events of this passage in order. How did the unexpected problem lead to a positive outcome?',
    answer_key:
      'Sequence: Leo arrived to replace deck boards → found hidden water damage underneath → called his boss for guidance → documented with photos → explained the issue honestly to Mrs. Chen → she approved extra work → deck was fully rebuilt → she recommended Leo to neighbors. The unexpected problem led to a positive outcome because Leo handled it professionally (documented, communicated, was honest), which earned trust and referrals.',
    scoring_rubric: {
      detailed:
        'Lists 5+ events in correct sequence. Explains how the problem became an opportunity through professionalism (documentation, communication, honesty → trust → referrals). Connects cause and effect.',
      adequate: 'Lists 3-4 events in order. Notes that honesty or professionalism led to the good outcome.',
      vague: "Gives a general summary ('he fixed a deck') without sequencing events or explaining the connection.",
      skipped: "No response or 'I don't know.'",
    },
  },
  {
    skill_id: 'R9',
    reading_level: '9th-10th',
    difficulty: 'medium',
    age_appropriate_context: "Ocean metaphor — Olive's Ocean tie-in",
    passage_text:
      "The ocean at dawn was a study in contradictions. The surface appeared placid — a sheet of glass reflecting the pink and gold sky — but beneath that tranquil exterior, powerful currents pulled and shifted with enough force to drag a swimmer a quarter mile in minutes. Martha stood at the water's edge, letting the foam lap over her toes. She understood, perhaps better than most twelve-year-olds, that the most dangerous things in life often looked the most serene. Her grandmother had been like that ocean. Calm and gentle on the outside, but carrying depths and currents that no one fully understood until she was gone.",
    question: 'What do the words "placid" and "tranquil" mean in this passage? How does the author use the ocean as a metaphor for Martha\'s grandmother?',
    answer_key:
      "\"Placid\" and \"tranquil\" both mean calm, peaceful, and still. The author uses the ocean as a metaphor for Martha's grandmother — both appeared calm and gentle on the surface but had hidden depths, complexity, and powerful forces underneath. Just as the ocean's peaceful surface hides dangerous currents, the grandmother's gentle exterior concealed depths that weren't fully understood until she died.",
    scoring_rubric: {
      detailed:
        "Defines both words accurately (calm/peaceful/still). Fully explains the metaphor: ocean surface = grandmother's calm exterior, currents = hidden complexity/depth, 'gone' = death. Connects the idea that dangerous/powerful things can look serene.",
      adequate: 'Defines at least one word. Understands the basic metaphor (grandmother was like the ocean — calm outside, complex inside).',
      vague: "Defines the words but doesn't explain the metaphor, or explains the metaphor without defining the words.",
      skipped: "No response or 'I don't know.'",
    },
  },
]

async function run() {
  const client = await pool.connect()
  try {
    console.log(`Seeding ${passages.length} ELAR placement passages (Batch 1)...\n`)

    let updated = 0
    let inserted = 0
    let failed = 0

    for (const p of passages) {
      const pn = DIFFICULTY_TO_PN[p.difficulty]
      if (!pn) {
        console.error(`  [SKIP] ${p.skill_id} ${p.reading_level}: unknown difficulty "${p.difficulty}"`)
        failed++
        continue
      }
      try {
        // UPDATE first — if a stub row exists at this slot, replace it
        const result = await client.query(
          `UPDATE elar_placement_passages
           SET difficulty = $4,
               passage_text = $5,
               question = $6,
               answer_key = $7,
               scoring_rubric = $8::jsonb,
               age_appropriate_context = $9
           WHERE skill_id = $1 AND reading_level = $2 AND passage_number = $3
           RETURNING id`,
          [
            p.skill_id,
            p.reading_level,
            pn,
            p.difficulty,
            p.passage_text,
            p.question,
            p.answer_key,
            JSON.stringify(p.scoring_rubric),
            p.age_appropriate_context || null,
          ]
        )

        if (result.rowCount > 0) {
          updated++
          console.log(`  [UPD] ${p.skill_id.padEnd(4)} ${p.reading_level.padEnd(10)} pn=${pn} (${p.difficulty.padEnd(6)}) ← ${p.age_appropriate_context}`)
        } else {
          // No existing row at that slot → INSERT
          await client.query(
            `INSERT INTO elar_placement_passages
               (skill_id, reading_level, difficulty, passage_number, passage_text, question, answer_key, scoring_rubric, age_appropriate_context)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)`,
            [
              p.skill_id,
              p.reading_level,
              p.difficulty,
              pn,
              p.passage_text,
              p.question,
              p.answer_key,
              JSON.stringify(p.scoring_rubric),
              p.age_appropriate_context || null,
            ]
          )
          inserted++
          console.log(`  [INS] ${p.skill_id.padEnd(4)} ${p.reading_level.padEnd(10)} pn=${pn} (${p.difficulty.padEnd(6)}) ← ${p.age_appropriate_context}`)
        }
      } catch (err) {
        failed++
        console.error(`  [ERR] ${p.skill_id} ${p.reading_level} pn=${pn}: ${err.message}`)
      }
    }

    console.log(`\nDone — updated: ${updated}, inserted: ${inserted}, failed: ${failed}`)

    // Verification: show the topics on the updated slots
    const verify = await client.query(
      `SELECT skill_id, reading_level, difficulty, age_appropriate_context
       FROM elar_placement_passages
       WHERE age_appropriate_context IS NOT NULL
         AND age_appropriate_context NOT LIKE 'A %'
       ORDER BY reading_level, skill_id`
    )
    console.log(`\nCustom-context passages now in table: ${verify.rowCount}`)
    for (const r of verify.rows) {
      console.log(`  ${r.skill_id.padEnd(4)} ${r.reading_level.padEnd(10)} ${r.difficulty.padEnd(6)} — ${r.age_appropriate_context}`)
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
