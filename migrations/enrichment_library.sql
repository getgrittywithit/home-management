-- ============================================================================
-- Migration: Enrichment Activity Loops + Financial Literacy + Typing Race
--            + Home Library + Game Library
-- ============================================================================

-- ============================================================================
-- 1. ENRICHMENT ACTIVITIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS enrichment_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN (
    'math','elar','science','social_studies','life_skills','financial_literacy','art','pe_outdoor'
  )),
  duration_min INTEGER NOT NULL,
  location TEXT NOT NULL CHECK (location IN ('indoor','outdoor','either')),
  solo_or_group TEXT NOT NULL CHECK (solo_or_group IN ('solo','partner','group','any')),
  min_players INTEGER DEFAULT 1,
  max_players INTEGER DEFAULT 1,
  materials TEXT[],
  accessibility_conflicts TEXT[],
  grade_min INTEGER DEFAULT 1,
  grade_max INTEGER DEFAULT 12,
  financial_level INTEGER,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. KID ENRICHMENT LOG
-- ============================================================================
CREATE TABLE IF NOT EXISTS kid_enrichment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name TEXT NOT NULL,
  activity_id UUID REFERENCES enrichment_activities(id),
  shown_at TIMESTAMPTZ DEFAULT NOW(),
  picked BOOLEAN DEFAULT FALSE,
  completed BOOLEAN DEFAULT FALSE,
  stars_earned INTEGER DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ============================================================================
-- 3. TYPING SESSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS typing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name TEXT NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  wpm INTEGER NOT NULL,
  accuracy_pct INTEGER NOT NULL,
  passage_id TEXT,
  dyslexia_mode BOOLEAN DEFAULT FALSE,
  race_mode BOOLEAN DEFAULT FALSE,
  race_participants TEXT[],
  race_position INTEGER,
  personal_best BOOLEAN DEFAULT FALSE,
  stars_earned INTEGER DEFAULT 0
);

-- ============================================================================
-- 4. FINANCIAL LITERACY PROGRESS
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_literacy_progress (
  kid_name TEXT PRIMARY KEY,
  current_level INTEGER DEFAULT 1 CHECK (current_level BETWEEN 1 AND 6),
  level_1_complete BOOLEAN DEFAULT FALSE,
  level_2_complete BOOLEAN DEFAULT FALSE,
  level_3_complete BOOLEAN DEFAULT FALSE,
  level_4_complete BOOLEAN DEFAULT FALSE,
  level_5_complete BOOLEAN DEFAULT FALSE,
  level_6_complete BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO financial_literacy_progress (kid_name, current_level) VALUES
  ('amos', 1),
  ('hannah', 1),
  ('wyatt', 2),
  ('ellie', 4),
  ('kaylee', 2),
  ('zoey', 5)
ON CONFLICT (kid_name) DO NOTHING;

-- ============================================================================
-- 5. HOME LIBRARY
-- ============================================================================
CREATE TABLE IF NOT EXISTS home_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL CHECK (item_type IN ('book','game','toy','resource')),
  title TEXT NOT NULL,
  author_or_publisher TEXT,
  isbn TEXT,
  upc TEXT,
  description TEXT,
  cover_image_url TEXT,
  grade_min INTEGER,
  grade_max INTEGER,
  subject_tags TEXT[],
  edu_uses TEXT[],
  player_min INTEGER,
  player_max INTEGER,
  play_time_min INTEGER,
  play_time_max INTEGER,
  play_style TEXT CHECK (play_style IN ('cooperative','competitive','mixed','solo','any',NULL)),
  competition_level TEXT CHECK (competition_level IN ('low','medium','high',NULL)),
  accessibility_flags TEXT[],
  who_uses TEXT[],
  location_in_home TEXT,
  condition TEXT CHECK (condition IN ('great','good','worn','missing pieces',NULL)),
  favorite_flag BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  archived BOOLEAN DEFAULT FALSE,
  added_by TEXT DEFAULT 'lola',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  last_used DATE
);

-- ============================================================================
-- 6. LIBRARY SEARCH LOG
-- ============================================================================
CREATE TABLE IF NOT EXISTS library_search_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_name TEXT,
  search_type TEXT CHECK (search_type IN ('browse','ai_buddy','subject_filter','quick_search')),
  query_subject TEXT,
  query_mood TEXT,
  query_format TEXT,
  results_returned INTEGER,
  item_selected UUID REFERENCES home_library(id),
  searched_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. TYPING PASSAGES (seeded pool)
-- ============================================================================
CREATE TABLE IF NOT EXISTS typing_passages (
  id TEXT PRIMARY KEY,
  grade_band TEXT NOT NULL CHECK (grade_band IN ('lower','middle','upper')),
  text TEXT NOT NULL,
  word_count INTEGER NOT NULL,
  dyslexia_version TEXT,
  dyslexia_word_count INTEGER,
  active BOOLEAN DEFAULT TRUE
);

-- Lower = grades 2-3 (~30 words), Middle = grades 4-6 (~60 words), Upper = grades 7-10 (~80 words, dyslexia ~40)
INSERT INTO typing_passages (id, grade_band, text, word_count, dyslexia_version, dyslexia_word_count) VALUES
  ('lower-01','lower','The big brown dog ran across the green grass. He jumped over a small rock and landed in the soft mud.',20,NULL,NULL),
  ('lower-02','lower','I like to read books about animals. My favorite animal is a red fox that lives in the woods.',18,NULL,NULL),
  ('lower-03','lower','The sun is warm today. I can see three birds in the tall tree near our house.',16,NULL,NULL),
  ('lower-04','lower','We went to the park after lunch. I played on the swings and my sister went down the slide.',18,NULL,NULL),
  ('lower-05','lower','My cat likes to sit on the soft blue rug. She sleeps all day and plays at night.',17,NULL,NULL),
  ('lower-06','lower','The rain came down fast. We ran inside and made hot chocolate with little white marshmallows.',16,NULL,NULL),
  ('lower-07','lower','I drew a picture of a big red barn. There were two horses and five chickens in the yard.',18,NULL,NULL),
  ('lower-08','lower','The moon was bright last night. I could see the stars from my bedroom window.',14,NULL,NULL),
  ('lower-09','lower','We made cookies after school. I put sprinkles on top and gave one to my brother.',15,NULL,NULL),
  ('lower-10','lower','The frog sat on a lily pad in the pond. He jumped into the cool water with a big splash.',19,NULL,NULL),
  ('lower-11','lower','My dog Belle loves her morning walk. She runs ahead and sniffs every rock and bush she can find.',18,NULL,NULL),
  ('lower-12','lower','I found a smooth gray rock by the river. I put it in my pocket to bring home.',16,NULL,NULL),
  ('lower-13','lower','The garden has red and yellow flowers. A butterfly landed on one and then flew away.',15,NULL,NULL),
  ('lower-14','lower','We had a picnic under the big oak tree. I ate a sandwich and drank cold lemonade.',16,NULL,NULL),
  ('lower-15','lower','My favorite color is green like the leaves on the trees. Green makes me think of spring.',16,NULL,NULL),
  ('lower-16','lower','The wind blew my hat off my head. I chased it across the yard until I caught it.',17,NULL,NULL),
  ('lower-17','lower','I helped Mom water the plants this morning. The tomato plant is getting very tall.',14,NULL,NULL),
  ('lower-18','lower','There are fish in the creek near our house. I like to watch them swim over the rocks.',17,NULL,NULL),
  ('lower-19','lower','We built a fort out of blankets and pillows. It was the best fort we ever made.',16,NULL,NULL),
  ('lower-20','lower','The baby bird learned to fly today. It hopped on the branch and then jumped into the air.',17,NULL,NULL),

  ('middle-01','middle','The desert is a place where very little rain falls each year. Many people think deserts are always hot, but some deserts are actually very cold. Plants and animals that live in the desert have learned special ways to find water and stay cool during the hottest parts of the day.',48,NULL,NULL),
  ('middle-02','middle','Benjamin Franklin was one of the most interesting people in American history. He was an inventor, a writer, a printer, and a leader. He helped create the first public library and he discovered that lightning is made of electricity. He also helped write the Declaration of Independence.',45,NULL,NULL),
  ('middle-03','middle','The water cycle is how water moves around our planet. Water in lakes and oceans heats up and turns into vapor. The vapor rises into the sky and forms clouds. When the clouds get heavy enough, the water falls back down as rain or snow. Then it flows back into rivers and lakes.',49,NULL,NULL),
  ('middle-04','middle','Volcanoes are openings in the surface of the Earth. Deep underground, rock gets so hot that it melts into a thick liquid called magma. When pressure builds up, the magma pushes through the opening and flows out as lava. Some eruptions are gentle while others are very powerful and explosive.',47,NULL,NULL),
  ('middle-05','middle','The Amazon rainforest is the largest tropical forest in the world. It covers parts of nine different countries in South America. More types of plants and animals live there than almost anywhere else on Earth. Scientists are still discovering new species every year.',43,NULL,NULL),
  ('middle-06','middle','Honeybees are some of the hardest working creatures on the planet. A single bee visits hundreds of flowers every day to collect nectar. Back at the hive, bees work together to turn that nectar into honey. One hive can make over sixty pounds of honey in a single year.',48,NULL,NULL),
  ('middle-07','middle','The ocean covers more than seventy percent of the surface of the Earth. It is divided into five major oceans. The deepest point in the ocean is called the Mariana Trench, and it goes down nearly seven miles. We have explored less of the ocean floor than the surface of the moon.',48,NULL,NULL),
  ('middle-08','middle','Thomas Edison tried thousands of different materials before he found one that worked as a light bulb filament. Many people would have given up, but Edison kept going. He once said that he had not failed, he had just found ten thousand ways that did not work.',46,NULL,NULL),
  ('middle-09','middle','Earthquakes happen when large pieces of the Earth called tectonic plates shift and move against each other. Most earthquakes are too small for people to feel. But strong earthquakes can cause buildings to fall and the ground to crack open. Scientists use tools called seismographs to measure them.',47,NULL,NULL),
  ('middle-10','middle','Owls are night hunters with amazing abilities. Their large eyes help them see in very low light. Their ears are placed at different heights on their head so they can pinpoint exactly where a sound is coming from. They can turn their heads almost all the way around.',46,NULL,NULL),
  ('middle-11','middle','Coral reefs are sometimes called the rainforests of the sea because so many different creatures live in them. Coral may look like rock or plants but it is actually made up of tiny living animals. Reefs take thousands of years to grow and are very sensitive to changes in water temperature.',48,NULL,NULL),
  ('middle-12','middle','The ancient Egyptians built the pyramids more than four thousand years ago. The Great Pyramid at Giza was the tallest structure in the world for nearly four thousand years. Each stone block weighed as much as a car. Scientists are still trying to figure out exactly how they moved them.',48,NULL,NULL),
  ('middle-13','middle','Sharks have been swimming in the oceans for over four hundred million years. That means they were around before the dinosaurs. There are more than five hundred species of shark, and most of them are not dangerous to humans at all. Whale sharks, the largest fish alive, eat only tiny plankton.',48,NULL,NULL),
  ('middle-14','middle','Texas is the second largest state in the United States. It has mountains, deserts, forests, beaches, and wide open plains. The state bird is the mockingbird and the state flower is the bluebonnet. Many different cultures have shaped the food, music, and traditions of Texas over the years.',46,NULL,NULL),
  ('middle-15','middle','When you exercise, your heart pumps faster to send more blood to your muscles. Your lungs work harder to bring in extra oxygen. After a good workout, your body releases chemicals that make you feel happy and relaxed. That is why people often feel so good after playing sports or going for a run.',50,NULL,NULL),
  ('middle-16','middle','Maps have been used for thousands of years to help people find their way. Early maps were drawn on animal skins and clay tablets. Today we use digital maps on our phones that can show us exactly where we are. But learning to read a paper map is still an important skill.',48,NULL,NULL),
  ('middle-17','middle','Butterflies start their lives as tiny eggs on the underside of leaves. When they hatch, they become caterpillars and eat as much as they can. Then they form a chrysalis around themselves. Inside, their entire body changes, and they come out as a butterfly with colorful wings.',45,NULL,NULL),
  ('middle-18','middle','The human brain is the most complex organ in your body. It controls everything you do, from breathing to thinking to feeling emotions. Your brain is always working, even when you are asleep. It uses about twenty percent of all the energy your body produces.',44,NULL,NULL),
  ('middle-19','middle','Recycling helps reduce the amount of trash that ends up in landfills. When we recycle paper, glass, metal, and plastic, those materials can be turned into new products. This saves energy and natural resources. Even small actions like using a reusable water bottle can make a difference.',45,NULL,NULL),
  ('middle-20','middle','The International Space Station orbits the Earth about sixteen times every day. Astronauts from many different countries live and work there for months at a time. In space, there is no gravity, so everything floats. Astronauts have to exercise for two hours every day to keep their muscles strong.',47,NULL,NULL),

  ('upper-01','upper','The concept of democracy originated in ancient Athens, where citizens gathered in public assemblies to vote on laws and policies. Unlike modern democracies, only free adult men who were born in Athens could participate. Women, enslaved people, and foreigners were excluded from the process entirely. Despite these limitations, the Athenian model laid the groundwork for the systems of government that many countries use today.',64,'Democracy started in ancient Athens. Citizens met in groups to vote on laws. Only free men born in Athens could vote. Women and enslaved people could not. This model shaped governments around the world.',33),
  ('upper-02','upper','Photosynthesis is the process by which green plants convert sunlight into food. Chlorophyll, the pigment that gives leaves their green color, absorbs light energy from the sun. The plant then uses this energy along with carbon dioxide from the air and water from the soil to produce glucose, a type of sugar. Oxygen is released as a byproduct, which is essential for the survival of most living things on Earth.',66,'Plants use sunlight to make food. A green pigment called chlorophyll absorbs the light. The plant mixes light, air, and water to make sugar. Oxygen comes out, which we need to breathe.',32),
  ('upper-03','upper','The invention of the printing press by Johannes Gutenberg around 1440 is considered one of the most important events in human history. Before the press, books had to be copied by hand, which was slow and expensive. The printing press made it possible to produce books quickly and cheaply, which spread knowledge to more people than ever before and helped spark the Renaissance and the Scientific Revolution.',63,'Gutenberg invented the printing press around 1440. Before that, books were copied by hand. The press made books fast and cheap. More people could learn, and it helped start big changes in science and art.',34),
  ('upper-04','upper','The Great Wall of China stretches over thirteen thousand miles across northern China. Construction began more than two thousand years ago during the Qin Dynasty and continued for centuries under different rulers. The wall was built primarily to protect Chinese states from invasions by nomadic groups from the north. Today it stands as one of the most remarkable engineering achievements in history and attracts millions of visitors each year.',67,'The Great Wall of China is over thirteen thousand miles long. It was built over two thousand years ago to stop invaders. Many rulers added to it over the centuries. Today millions of people visit it.',34),
  ('upper-05','upper','Financial literacy means understanding how money works in the real world. It includes knowing how to budget, save, invest, and manage debt. Many young people graduate from high school without ever learning how to read a pay stub, file taxes, or understand how interest on a credit card can grow rapidly. Building these skills early can prevent costly mistakes and help create long-term financial stability.',61,'Financial literacy means knowing how money works. It includes budgeting, saving, and managing debt. Many teens never learn to read a pay stub or file taxes. Learning early helps avoid big money mistakes.',32),
  ('upper-06','upper','The human immune system is a complex network of cells, tissues, and organs that work together to defend the body against harmful invaders like bacteria, viruses, and parasites. White blood cells are the soldiers of this system, constantly patrolling the bloodstream for threats. When they detect something foreign, they launch a targeted attack to neutralize it. Vaccines train the immune system to recognize specific threats before they cause illness.',67,'Your immune system fights germs like bacteria and viruses. White blood cells patrol your blood looking for threats. When they find one, they attack it. Vaccines teach your body to fight specific germs before you get sick.',35),
  ('upper-07','upper','Climate change refers to long-term shifts in global temperatures and weather patterns. While some changes are natural, human activities such as burning fossil fuels, deforestation, and industrial agriculture have significantly accelerated the process since the Industrial Revolution. The resulting increase in greenhouse gases traps more heat in the atmosphere, leading to rising sea levels, more extreme weather events, and shifts in ecosystems around the world.',66,'Climate change means long-term shifts in weather and temperature. Burning fossil fuels and cutting down forests have sped it up. More heat gets trapped in the air. This causes rising seas and extreme weather.',33),
  ('upper-08','upper','The Renaissance was a period of cultural rebirth that began in Italy in the fourteenth century and spread across Europe over the next three hundred years. Artists like Leonardo da Vinci and Michelangelo created works that are still celebrated today. The movement emphasized humanism, a philosophy that placed greater value on individual achievement and the study of classical Greek and Roman texts.',60,'The Renaissance was a time of cultural rebirth starting in Italy in the 1300s. Artists like Leonardo da Vinci made famous works. People valued individual achievement and studied ancient Greek and Roman ideas.',32),
  ('upper-09','upper','The periodic table organizes all known chemical elements by their atomic number and chemical properties. Dmitri Mendeleev, a Russian chemist, created the first widely recognized version in 1869. He even predicted the existence of elements that had not yet been discovered, leaving gaps in his table where he believed they would eventually be found. Most of his predictions turned out to be remarkably accurate.',62,'The periodic table lists all chemical elements by their properties. A Russian chemist named Mendeleev created it in 1869. He predicted elements that had not been found yet. Most of his guesses were right.',33),
  ('upper-10','upper','Entrepreneurship is the process of starting and running your own business. It requires creativity, problem-solving skills, and a willingness to take risks. Many successful entrepreneurs failed multiple times before finding an idea that worked. The key is learning from each failure and continuing to adapt. Understanding your market, managing your finances carefully, and providing real value to customers are essential to building a business that lasts.',66,'Entrepreneurship means starting your own business. It takes creativity and willingness to take risks. Many successful people failed before they succeeded. Learning from failure, knowing your customers, and managing money are key.',31),
  ('upper-11','upper','Sleep is far more important than most people realize. During sleep, your brain processes the information you learned during the day, strengthening memories and making connections between ideas. Your body also uses sleep to repair muscles, regulate hormones, and strengthen your immune system. Teenagers need about eight to ten hours of sleep per night, but many get far less due to school schedules, screen time, and social pressures.',67,'Sleep is very important. Your brain processes what you learned during the day while you sleep. Your body also repairs itself. Teens need eight to ten hours per night, but many get much less.',33),
  ('upper-12','upper','The civil rights movement of the 1950s and 1960s was a struggle for equality and justice for African Americans in the United States. Leaders like Martin Luther King Jr. organized peaceful protests, marches, and boycotts to challenge segregation and discrimination. The movement led to landmark legislation including the Civil Rights Act of 1964 and the Voting Rights Act of 1965, which outlawed many forms of racial discrimination.',65,'The civil rights movement fought for equality for African Americans. Leaders like Martin Luther King Jr. led peaceful protests. This led to new laws in 1964 and 1965 that outlawed racial discrimination.',31),
  ('upper-13','upper','Coding is the process of writing instructions that tell a computer what to do. Every app on your phone, every website you visit, and every video game you play was built using code. There are many different programming languages, each designed for different purposes. Learning to code teaches logical thinking and problem-solving skills that are valuable in almost every career, not just technology.',60,'Coding means writing instructions for a computer. Every app, website, and game is built with code. There are many programming languages for different tasks. Coding teaches thinking skills useful in any career.',30),
  ('upper-14','upper','The Amazon River is the largest river in the world by volume of water flow. It carries more water than the next seven largest rivers combined. The river stretches about four thousand miles across South America, flowing through dense rainforest and supporting an incredible diversity of wildlife. More than three thousand species of fish live in its waters, including piranhas and the endangered Amazon river dolphin.',63,'The Amazon River carries more water than any other river. It stretches four thousand miles across South America through dense rainforest. Over three thousand species of fish live in it, including piranhas and river dolphins.',35),
  ('upper-15','upper','Critical thinking is the ability to analyze information carefully before forming an opinion or making a decision. It involves asking questions, examining evidence, considering different perspectives, and recognizing bias. In a world filled with social media, advertisements, and competing claims, the ability to think critically is more important than ever. It helps you make better choices and avoid being misled by false or incomplete information.',65,'Critical thinking means analyzing information before forming opinions. It involves asking questions and examining evidence. With social media and competing claims everywhere, thinking critically helps you make better choices and spot false information.',30),
  ('upper-16','upper','The digestive system breaks down the food you eat into nutrients your body can use for energy, growth, and repair. The process begins in your mouth, where enzymes in your saliva start breaking down starches. Food then travels through your esophagus to your stomach, where acids continue the process. In the small intestine, nutrients are absorbed into your bloodstream. The large intestine absorbs water before waste is eliminated.',66,'Your digestive system turns food into nutrients. It starts in your mouth where saliva breaks down starch. Food goes to your stomach where acids work on it. The small intestine absorbs nutrients into your blood.',33),
  ('upper-17','upper','Ancient Rome grew from a small city-state on the Italian peninsula into one of the largest empires in history. At its peak, the Roman Empire controlled territory across Europe, North Africa, and the Middle East. The Romans built roads, aqueducts, and buildings that still stand today. Their system of laws influenced the legal systems of many modern nations, and Latin, the language they spoke, evolved into the Romance languages.',66,'Ancient Rome grew from a small city into a huge empire. It controlled land across Europe, Africa, and the Middle East. Romans built roads and buildings that still stand. Their laws and language shaped the modern world.',35),
  ('upper-18','upper','Nutrition plays a vital role in how well your brain functions and how you feel throughout the day. Eating a balanced diet with fruits, vegetables, whole grains, and lean proteins gives your body the fuel it needs. Skipping breakfast can make it harder to concentrate in class. Drinking enough water is also important because even mild dehydration can affect your mood, memory, and ability to focus.',62,'Good nutrition helps your brain work well. Eating fruits, vegetables, grains, and protein gives your body fuel. Skipping breakfast makes it hard to focus. Drinking water matters because dehydration hurts your mood and memory.',32),
  ('upper-19','upper','Gravity is the force that pulls objects toward each other. On Earth, gravity is what keeps us on the ground and causes objects to fall when dropped. The strength of gravity depends on the mass of the objects and the distance between them. The moon has less mass than Earth, so gravity is weaker there. An astronaut who weighs one hundred eighty pounds on Earth would weigh only thirty pounds on the moon.',66,'Gravity pulls objects toward each other. It keeps us on the ground. Gravity depends on mass and distance. The moon has less mass, so gravity is weaker there. You would weigh much less on the moon.',34),
  ('upper-20','upper','Public speaking is a skill that can be developed with practice. Many people feel nervous about speaking in front of others, but preparation and repetition can help reduce that anxiety. Knowing your topic well, organizing your thoughts clearly, and making eye contact with your audience are all strategies that effective speakers use. The ability to communicate your ideas confidently is valuable in school, work, and everyday life.',65,'Public speaking can be learned with practice. Many people feel nervous, but preparation helps. Know your topic, organize your thoughts, and make eye contact. Speaking confidently is valuable in school, work, and life.',31)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. SEED ENRICHMENT ACTIVITIES — MATH (25)
-- ============================================================================
INSERT INTO enrichment_activities (title, description, subject, duration_min, location, solo_or_group, min_players, max_players, materials, accessibility_conflicts, grade_min, grade_max) VALUES
  ('Coin Sort & Count','Sort all your loose change by type. Count each pile. Add it all up. How much total?','math',10,'indoor','solo',1,1,ARRAY['coins'],ARRAY[]::text[],1,4),
  ('Make Change Game','One person is the cashier, one is the customer. Use real coins and make-believe prices on sticky notes.','math',15,'indoor','partner',2,2,ARRAY['coins','sticky notes'],ARRAY[]::text[],2,5),
  ('Dice War — Multiply','Each player rolls 2 dice and multiplies the numbers. Highest product wins the round. Play 10 rounds.','math',10,'indoor','partner',2,2,ARRAY['dice'],ARRAY['math_heavy'],3,6),
  ('Measurement Hunt','Find and measure 10 things around the house with a ruler or tape measure. Write them down.','math',15,'indoor','solo',1,1,ARRAY['ruler or tape measure','paper','pencil'],ARRAY[]::text[],2,5),
  ('Skip Count Challenge','Skip count by 2s, 5s, or 10s while bouncing a ball or doing jumping jacks. Switch numbers each round.','math',10,'outdoor','any',1,2,ARRAY[]::text[],ARRAY[]::text[],1,3),
  ('Domino Math Facts','Lay all dominoes face-down. Flip one, write an addition or multiplication problem using the two numbers. Solve it.','math',15,'indoor','solo',1,1,ARRAY['dominoes','paper','pencil'],ARRAY[]::text[],2,5),
  ('Fraction Pizza','Fold a piece of paper in half, then quarters, then eighths. Color in different fractions. Write what fraction you colored.','math',10,'indoor','solo',1,1,ARRAY['paper','crayons or pencil'],ARRAY[]::text[],3,5),
  ('Grocery Store Price Hunt','Pick 5 items from the pantry. Write their prices if they have them or make up prices. Add up the total.','math',15,'indoor','solo',1,1,ARRAY['pantry items','paper','pencil'],ARRAY[]::text[],3,6),
  ('Pattern Build','Use LEGO, blocks, or coins to make a repeating pattern. Extend it 3 more times. Draw it on paper.','math',10,'indoor','solo',1,1,ARRAY['blocks or lego or coins'],ARRAY[]::text[],1,4),
  ('Geometry Shape Hunt — Outdoor','Go outside and find 5 different shapes (circle, square, triangle, rectangle, hexagon). Draw and label each.','math',15,'outdoor','solo',1,1,ARRAY['paper','pencil'],ARRAY[]::text[],2,5),
  ('Playing Card Math War','Use a deck of cards (numbers only). Each player flips 2 cards and adds or multiplies them. Highest answer wins both cards.','math',15,'indoor','partner',2,2,ARRAY['playing cards'],ARRAY['color_heavy'],2,5),
  ('Domino Train','Chain dominoes by matching numbers. Count the total dots in your finished train.','math',10,'indoor','any',1,2,ARRAY['dominoes'],ARRAY[]::text[],1,3),
  ('Budget Bingo','Make a BINGO card with dollar amounts. One person calls out prices of pretend items. Mark it off.','math',15,'indoor','group',2,4,ARRAY['paper','pencil'],ARRAY['math_heavy'],3,6),
  ('Estimation Jar','Fill a jar with small objects. Everyone guesses how many. Count and see who was closest.','math',10,'indoor','group',2,4,ARRAY['jar','small objects'],ARRAY[]::text[],1,5),
  ('Money Word Problem Draw','Parent writes 5 money word problems on index cards. Kid draws one, solves it using real coins as props.','math',15,'indoor','solo',1,1,ARRAY['index cards','coins'],ARRAY[]::text[],3,6),
  ('Ruler Race','Estimate the length of 8 things. Then measure each. Whose estimate was closest?','math',15,'indoor','partner',2,2,ARRAY['ruler','paper'],ARRAY[]::text[],2,5),
  ('Times Table Hopscotch','Draw a hopscotch board outside. Call out a number — multiply it by the number you land on.','math',15,'outdoor','group',2,4,ARRAY['chalk'],ARRAY[]::text[],3,6),
  ('Shapes in Nature Walk','Walk around outside. Photograph or sketch every geometric shape you can find (natural or man-made).','math',20,'outdoor','any',1,4,ARRAY['paper or pencil or phone'],ARRAY[]::text[],2,6),
  ('Pretend Store','Set up a mini store with household items and price tags. One person shops, one person runs the register. Make change.','math',20,'indoor','partner',2,2,ARRAY['household items','sticky notes','coins'],ARRAY[]::text[],2,5),
  ('Temperature Check','Read the thermometer inside and outside. Subtract the difference. What is it going to be tomorrow?','math',10,'either','any',1,2,ARRAY['thermometer'],ARRAY[]::text[],3,6),
  ('Fraction Snack','Cut an apple, sandwich, or other snack into halves, quarters, or thirds. Say the fraction as you eat each piece.','math',10,'indoor','solo',1,1,ARRAY['food','knife (with parent)'],ARRAY[]::text[],2,4),
  ('Coin Rubbings + Values','Place coins under paper, rub with pencil to make impressions. Label each coin name and value.','math',10,'indoor','solo',1,1,ARRAY['coins','paper','pencil'],ARRAY[]::text[],1,3),
  ('Nature Counting Book','Go outside and count things: 3 leaves, 7 rocks, 2 birds. Draw and write a mini counting book.','math',20,'outdoor','solo',1,1,ARRAY['paper','pencil'],ARRAY[]::text[],1,3),
  ('Card Game — War (Subtraction)','Each player flips 2 cards. Subtract the smaller from the larger. Highest answer wins.','math',15,'indoor','partner',2,2,ARRAY['playing cards'],ARRAY['color_heavy'],2,4),
  ('Hundred Chart Puzzle','Print or draw a 1-100 chart. Cut it into 10 strips. Mix up the strips. See how fast you can put them back in order.','math',10,'indoor','solo',1,1,ARRAY['paper','scissors'],ARRAY[]::text[],1,3)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. SEED ENRICHMENT ACTIVITIES — ELAR (25)
-- ============================================================================
INSERT INTO enrichment_activities (title, description, subject, duration_min, location, solo_or_group, min_players, max_players, materials, accessibility_conflicts, grade_min, grade_max) VALUES
  ('Vocab Flashcard Duel','Grab your flashcard set. One person reads the definition, other slaps the card when they know the word. Switch roles.','elar',10,'indoor','partner',2,2,ARRAY['flashcards'],ARRAY['verbal_required'],4,10),
  ('Word Scavenger Hunt','Find one object in the house for each letter of the alphabet. Write the list. Bonus: use a word from your current vocab set.','elar',20,'indoor','any',1,4,ARRAY['paper','pencil'],ARRAY[]::text[],2,8),
  ('Nature Journal Entry','Go outside for 10 minutes. Observe carefully. Come back and write 5 sentences about what you saw, heard, or smelled.','elar',15,'outdoor','solo',1,1,ARRAY['journal or paper','pencil'],ARRAY[]::text[],2,8),
  ('Story Starter — Pick One','Choose a story starter from the app list. Write or dictate at least 5 sentences to continue the story.','elar',15,'indoor','solo',1,1,ARRAY[]::text[],ARRAY['reading_heavy'],2,8),
  ('Comic Strip Creator','Fold a paper into 4 panels. Draw a mini-story with captions. It can be funny, adventurous, or based on a book you are reading.','elar',20,'indoor','solo',1,1,ARRAY['paper','pencil','crayons'],ARRAY[]::text[],2,8),
  ('Read Aloud to Belle (or a Sibling)','Pick any book and read 2-4 pages out loud to Belle or a younger sibling. Focus on expression, not speed.','elar',10,'indoor','solo',1,1,ARRAY['any book'],ARRAY[]::text[],1,5),
  ('Synonym Battle','One person says a word. The other must give 3 synonyms before the sand timer runs out. Switch turns.','elar',10,'indoor','partner',2,2,ARRAY['optional sand timer'],ARRAY['verbal_required'],3,8),
  ('Handwriting Copy Challenge','Pick a favorite sentence from your current book or a quote you like. Copy it 3 times in your best handwriting.','elar',10,'indoor','solo',1,1,ARRAY['paper','pencil'],ARRAY[]::text[],2,8),
  ('Letter Writing','Write a real letter (on paper) to anyone you care about — grandparent, cousin, pen pal. Address it and everything.','elar',20,'indoor','solo',1,1,ARRAY['paper','pencil','envelope'],ARRAY[]::text[],3,8),
  ('Typing Race Warm-Up','Open the Typing Race in the app. Complete one passage. Try to beat your personal best WPM.','elar',10,'indoor','any',1,4,ARRAY[]::text[],ARRAY[]::text[],2,10),
  ('Geography Word Find','Pick one country from the world map. Find 5 facts about it. Write them as complete sentences.','elar',15,'indoor','solo',1,1,ARRAY['globe or atlas or app'],ARRAY[]::text[],3,8),
  ('Rhyme Challenge','One person says a word. The other rhymes as many words as possible in one minute. No repeats. Keep score.','elar',10,'indoor','partner',2,2,ARRAY[]::text[],ARRAY['verbal_required'],1,5),
  ('Silly Sentence Builder','Each person writes a Who + Doing What + Where + When on separate strips of paper. Shuffle and combine for silly sentences.','elar',15,'indoor','group',2,4,ARRAY['paper','scissors'],ARRAY[]::text[],2,5),
  ('Book Club — Tell Me About Your Book','Tell a sibling or parent about the book you are reading in 5 sentences. What happened? What is coming next?','elar',10,'indoor','partner',2,2,ARRAY[]::text[],ARRAY['verbal_required'],2,8),
  ('Punctuation Hunt','Open any book to a random page. Tally every period, comma, exclamation, and question mark you find. Which is most common?','elar',10,'indoor','solo',1,1,ARRAY['any book','tally paper'],ARRAY[]::text[],2,5),
  ('Descriptive Writing Sprint','Pick any object in the room. Write 6 sentences describing it without naming it. Read it to a sibling — can they guess?','elar',15,'indoor','solo',1,1,ARRAY['paper','pencil'],ARRAY[]::text[],3,8),
  ('Alphabet Story','Write a story where every sentence starts with the next letter of the alphabet. See how far you can get.','elar',15,'indoor','solo',1,1,ARRAY['paper','pencil'],ARRAY['reading_heavy'],4,8),
  ('Word Sort Race','Write 10 vocab words on small cards. Sort them by part of speech (noun, verb, adjective) as fast as you can.','elar',10,'indoor','solo',1,1,ARRAY['index cards','pencil'],ARRAY[]::text[],3,8),
  ('Mad Libs Style Fill-In','Parent writes a short story with blanks labeled noun, verb, adjective. Kid fills in words without seeing the story first. Read it aloud.','elar',10,'indoor','partner',2,2,ARRAY['pre-made story card'],ARRAY['verbal_required'],2,6),
  ('Name Poetry','Write your name vertically on paper. For each letter, write a word or phrase that describes you starting with that letter.','elar',15,'indoor','solo',1,1,ARRAY['paper','pencil'],ARRAY[]::text[],2,6),
  ('Observation Drawing + Label','Draw something from nature (plant, rock, bug, cloud). Label 5 parts using real vocabulary words.','elar',15,'either','solo',1,1,ARRAY['paper','pencil'],ARRAY[]::text[],2,6),
  ('Fluency Read — Time Yourself','Read one page from your current book out loud. Time yourself. Read it again. Did you get faster? Sound smoother?','elar',10,'indoor','solo',1,1,ARRAY['book','timer'],ARRAY[]::text[],1,5),
  ('Reverse Dictionary Game','One person reads a definition from the vocab cards (without showing the word). Others guess the word. First correct answer wins the card.','elar',10,'indoor','group',2,4,ARRAY['flashcards'],ARRAY[]::text[],3,8),
  ('Story Map','Draw a map of the setting from your current book. Label places, characters homes, key locations.','elar',20,'indoor','solo',1,1,ARRAY['paper','pencil','crayons'],ARRAY[]::text[],3,8),
  ('Caption Challenge','Find 3 photos in a magazine or print a few images. Write a caption (1-2 sentences) for each one.','elar',10,'indoor','solo',1,1,ARRAY['magazine or printed images','paper','pencil'],ARRAY[]::text[],2,6)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 10. SEED ENRICHMENT ACTIVITIES — SCIENCE (20)
-- ============================================================================
INSERT INTO enrichment_activities (title, description, subject, duration_min, location, solo_or_group, min_players, max_players, materials, accessibility_conflicts, grade_min, grade_max) VALUES
  ('Plant Measurement Log','Measure your tallest plant. Record the date and height. Check again in 3 days. Is it growing?','science',10,'either','solo',1,1,ARRAY['ruler','journal'],ARRAY[]::text[],1,6),
  ('Nature Color Walk','Go outside and find something from every color of the rainbow. Collect or draw each one.','science',20,'outdoor','any',1,4,ARRAY['bag or paper or pencil'],ARRAY['color_heavy'],1,5),
  ('Kitchen Chemistry — Baking Soda + Vinegar','Mix baking soda and vinegar. Observe the reaction. Try adding different amounts. Draw what happens.','science',15,'indoor','any',1,4,ARRAY['baking soda','vinegar','bowls'],ARRAY[]::text[],1,6),
  ('Cloud Watch + Journal','Lie outside for 10 minutes. Identify cloud types (cumulus, stratus, cirrus). Draw 3 clouds you see.','science',15,'outdoor','any',1,4,ARRAY[]::text[],ARRAY[]::text[],2,6),
  ('Bug Safari','Walk the yard or near the river/woods. Find and observe 5 different bugs. Draw and describe each.','science',20,'outdoor','any',1,2,ARRAY['magnifying glass','paper','pencil'],ARRAY[]::text[],1,6),
  ('Kitchen Science — Sink or Float','Collect 10 objects. Predict which will sink or float. Test each one. Record your results.','science',15,'indoor','any',1,4,ARRAY['bucket or bowl of water','10 small objects'],ARRAY[]::text[],1,4),
  ('Seed Dissection','Split open a seed (bean, apple seed, sunflower). Draw what is inside. Label the parts if you can.','science',15,'indoor','solo',1,1,ARRAY['seeds','knife (parent assist)','magnifying glass'],ARRAY[]::text[],2,6),
  ('Shadow Tracing','Take an object outside. Trace its shadow in the morning and again in the afternoon. How did it move? Why?','science',10,'outdoor','solo',1,1,ARRAY['chalk or paper'],ARRAY[]::text[],2,5),
  ('Weather Data Tracker','Check the temperature, look at the sky, feel the wind. Record in a journal. Do it for 5 days — see patterns.','science',10,'outdoor','solo',1,1,ARRAY['thermometer','journal'],ARRAY[]::text[],2,6),
  ('Pet Observation Log (Belle)','Watch Belle for 10 minutes. Write 5 observations — what is she doing? What does she seem to feel? Why?','science',10,'indoor','solo',1,1,ARRAY['journal'],ARRAY[]::text[],2,6),
  ('Plant Watering Science','Water one plant normally, do not water another for a few days. Observe and compare. What does a thirsty plant look like?','science',5,'indoor','solo',1,1,ARRAY['2 similar plants'],ARRAY[]::text[],1,5),
  ('Kitchen Measurement Lab','Find a recipe. Measure out all the ingredients but do not cook yet. Practice measuring — leveled cups, tablespoons, teaspoons.','science',15,'indoor','solo',1,1,ARRAY['measuring cups and spoons','recipe ingredients'],ARRAY[]::text[],2,6),
  ('Rock Collection + Sort','Gather 10 rocks from outside. Sort them by size, then by color, then by texture. Draw your categories.','science',15,'outdoor','solo',1,1,ARRAY['rocks','paper'],ARRAY[]::text[],1,4),
  ('Bird Watch at the Window','Sit at a window for 10 minutes. Write down every bird you see. Draw the most interesting one.','science',10,'indoor','solo',1,1,ARRAY['paper','pencil'],ARRAY[]::text[],1,6),
  ('Soil Science','Dig up a small cup of dirt from the yard. Examine it closely. What do you see? How many living things?','science',15,'outdoor','solo',1,1,ARRAY['cup','small shovel','magnifying glass'],ARRAY[]::text[],1,5),
  ('Nature Scavenger Hunt — Boerne Edition','Find: something rough, something smooth, something living, something dead, something round, something that smells good.','science',20,'outdoor','any',1,4,ARRAY[]::text[],ARRAY[]::text[],1,6),
  ('Food Web Drawing','Pick an animal that lives near your house. Draw what it eats, and what eats it. How many layers deep can you go?','science',15,'indoor','solo',1,1,ARRAY['paper','pencil'],ARRAY[]::text[],3,7),
  ('Water Cycle in a Bag','Fill a ziplock bag with water, seal it, tape it to a sunny window. Watch condensation over 2-3 hours.','science',10,'indoor','solo',1,1,ARRAY['ziplock bag','water','tape','marker'],ARRAY[]::text[],2,5),
  ('Cooking Lab — Simple Recipe','Make a simple no-bake recipe together. Practice reading directions, measuring, following steps in order.','science',20,'indoor','group',2,4,ARRAY['recipe','ingredients'],ARRAY[]::text[],2,7),
  ('Compost Observation','Check the compost pile or a container of decomposing matter. What is breaking down? How does it smell and look?','science',10,'outdoor','solo',1,1,ARRAY['journal'],ARRAY[]::text[],3,7)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 11. SEED ENRICHMENT ACTIVITIES — SOCIAL STUDIES (20)
-- ============================================================================
INSERT INTO enrichment_activities (title, description, subject, duration_min, location, solo_or_group, min_players, max_players, materials, accessibility_conflicts, grade_min, grade_max) VALUES
  ('Country of the Week — Research Day','Pick any country. Find: capital city, 3 foods they eat, 1 national holiday, 1 interesting fact. Write it up.','social_studies',20,'indoor','solo',1,1,ARRAY['atlas or globe or online'],ARRAY[]::text[],3,8),
  ('Map Skills — US States','Open the US map. Point to and name 10 states. Quiz a sibling after.','social_studies',15,'indoor','partner',2,2,ARRAY['US map'],ARRAY[]::text[],3,7),
  ('Cultural Recipe — Cook It','Pick a country, find a simple traditional recipe for it, make it together. Eat and talk about where it came from.','social_studies',30,'indoor','group',2,4,ARRAY['ingredients'],ARRAY[]::text[],2,8),
  ('World Capitals Quiz','Parent or Zoey calls out a country name. Kids race to name the capital. Keep score.','social_studies',10,'indoor','group',2,4,ARRAY[]::text[],ARRAY['verbal_required'],4,9),
  ('Texas History — Tell Me Something','Look up one fact about Texas history. Share it with the group in 3 sentences.','social_studies',10,'indoor','solo',1,1,ARRAY[]::text[],ARRAY[]::text[],3,7),
  ('Family History Interview','Interview Mom or Dad about one memory from when they were young. Write it down or draw it.','social_studies',15,'indoor','partner',2,2,ARRAY[]::text[],ARRAY['verbal_required'],2,7),
  ('Flag Designers','Pick 3 countries and look up their flags. Draw each one. What do the colors and symbols mean?','social_studies',20,'indoor','solo',1,1,ARRAY['paper','colored pencils or crayons'],ARRAY[]::text[],3,7),
  ('Continent Slam','One person points to a random spot on the globe. Others race to name the continent, country, and nearest ocean.','social_studies',10,'indoor','group',2,4,ARRAY['globe or world map'],ARRAY['verbal_required'],3,8),
  ('World Language Basics','Pick a language. Learn to say: hello, goodbye, please, thank you, how much does this cost? Practice on each other.','social_studies',15,'indoor','group',2,4,ARRAY[]::text[],ARRAY['verbal_required'],2,8),
  ('Time Zone Explorer','Look at a world time zone map. If it is 10am in Texas, what time is it in Tokyo? London? Sydney?','social_studies',15,'indoor','any',1,2,ARRAY['world time zone map'],ARRAY['math_heavy'],4,8),
  ('Make a Map of Our House','Draw a floor plan of your home. Label every room. Add a compass rose (N, S, E, W).','social_studies',20,'indoor','solo',1,1,ARRAY['paper','pencil','ruler'],ARRAY[]::text[],2,6),
  ('Culture Comparison Chart','Pick 2 countries. Compare: food, weather, school day, common traditions. Draw a simple T-chart.','social_studies',20,'indoor','solo',1,1,ARRAY['paper','pencil'],ARRAY[]::text[],4,8),
  ('History Timeline — Moses Family','Work with parent to make a timeline of your family. Grandparents born, parents born, kids born, moves, big events.','social_studies',20,'indoor','group',2,4,ARRAY['long paper','pencil'],ARRAY[]::text[],3,8),
  ('Neighborhood Map','Draw a map of your street/neighborhood. Label your house, the park, the river, the woods. Add a scale.','social_studies',20,'either','solo',1,1,ARRAY['paper','pencil'],ARRAY[]::text[],3,7),
  ('State Symbols of Texas','Find out: Texas state bird, flower, tree, motto, and nickname. Draw the bird and flower.','social_studies',15,'indoor','solo',1,1,ARRAY['paper','pencil'],ARRAY[]::text[],2,6),
  ('National Geographic — Pick an Animal','Choose any animal. Find: where it lives on a map, what it eats, one cool fact. Draw it.','social_studies',15,'indoor','solo',1,1,ARRAY[]::text[],ARRAY[]::text[],1,6),
  ('Currency Around the World','Look up what 5 different countries use for money. Draw the bills or coins. What is $1 USD worth there?','social_studies',15,'indoor','solo',1,1,ARRAY[]::text[],ARRAY[]::text[],5,9),
  ('Immigrant Story','Ask a parent to tell you about one relative who came from somewhere else. Where? Why? Write or draw the story.','social_studies',20,'indoor','partner',2,2,ARRAY[]::text[],ARRAY['verbal_required'],3,8),
  ('City vs. Country','Compare life in a big city to life in a small town like Boerne. List 5 things that are different, 3 that are the same.','social_studies',15,'indoor','solo',1,1,ARRAY[]::text[],ARRAY[]::text[],3,7),
  ('Cultural Art Project','Pick a country and make an art piece inspired by their traditional patterns or symbols.','social_studies',30,'indoor','any',1,4,ARRAY['paper','scissors','colors'],ARRAY[]::text[],2,8)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 12. SEED ENRICHMENT ACTIVITIES — FINANCIAL LITERACY (30)
-- ============================================================================
INSERT INTO enrichment_activities (title, description, subject, duration_min, location, solo_or_group, min_players, max_players, materials, accessibility_conflicts, grade_min, grade_max, financial_level) VALUES
  -- Level 1 — Coin Identification
  ('Coin Sorting Race','Dump a pile of loose change. Sort into penny, nickel, dime, quarter piles as fast as you can. Name each coin while you go.','financial_literacy',10,'indoor','any',1,2,ARRAY['real coins'],ARRAY[]::text[],1,12,1),
  ('Coin Rubbings with Labels','Place each coin under paper, rub to reveal the image. Write the coin name and value next to it.','financial_literacy',10,'indoor','solo',1,1,ARRAY['coins','paper','pencil'],ARRAY[]::text[],1,12,1),
  ('How Much Is In My Hand?','Parent secretly puts some coins in their fist. Kid guesses how many cents without seeing. Open and check.','financial_literacy',10,'indoor','partner',2,2,ARRAY['coins'],ARRAY[]::text[],1,12,1),
  ('Coin Match Memory','Make 2 cards for each coin (one with the coin face, one with the name + value). Play memory match.','financial_literacy',15,'indoor','group',2,4,ARRAY['index cards (pre-made)'],ARRAY[]::text[],1,12,1),
  ('Dollar Goal','How many of each coin type do you need to make exactly $1.00? Write out 3 different combinations.','financial_literacy',10,'indoor','solo',1,1,ARRAY['coins','paper'],ARRAY[]::text[],1,12,1),
  -- Level 2 — Making Change
  ('Cashier Practice','Items are priced (sticky notes on household objects). Customer pays with $1. Cashier counts back change correctly.','financial_literacy',15,'indoor','partner',2,2,ARRAY['coins','sticky notes'],ARRAY[]::text[],2,12,2),
  ('Receipt Math','Parent makes a pretend receipt of 3-5 items. Add them up. You paid with $10. What is your change?','financial_literacy',10,'indoor','solo',1,1,ARRAY['pretend receipts','paper','pencil'],ARRAY[]::text[],2,12,2),
  ('Change Challenge Cards','Cards say "Item costs $0.67. You give $1.00. How much change?" Draw a card, count it out with real coins.','financial_literacy',15,'indoor','solo',1,1,ARRAY['pre-made cards','coins'],ARRAY[]::text[],2,12,2),
  -- Level 3 — Dollar Bills & Basic Budgeting
  ('Bill Identification Parade','Look at $1, $5, $10, $20 bills (real or printed). Name each person on the bill. Name the amount. Why do we use paper money?','financial_literacy',10,'indoor','solo',1,1,ARRAY['dollar bills or printed copies'],ARRAY[]::text[],3,12,3),
  ('Can I Afford It?','Parent lists 3 items with prices. Kid has a pretend budget of $15. Which combo of items can they buy?','financial_literacy',15,'indoor','solo',1,1,ARRAY['paper','pencil','pretend money'],ARRAY[]::text[],3,12,3),
  ('Budget Planner Mini','You earn $20 doing chores. You want to save $5, spend $10, and give $5. Is that possible? Make a simple plan.','financial_literacy',10,'indoor','solo',1,1,ARRAY['paper','pencil'],ARRAY[]::text[],3,12,3),
  -- Level 4 — Sales, Percentages, Tax
  ('Sale Day Math','Find 3 items in a grocery ad or on a receipt. Calculate 25% off each one. What is the sale price?','financial_literacy',15,'indoor','solo',1,1,ARRAY['grocery ad or receipt','paper','pencil'],ARRAY[]::text[],5,12,4),
  ('Sales Tax Explainer','Texas sales tax is about 8.25%. If something costs $10, how much tax is added? How much total?','financial_literacy',10,'indoor','solo',1,1,ARRAY['paper','pencil','calculator'],ARRAY[]::text[],5,12,4),
  ('10%-25%-50% Off Ladder','Item costs $40. Calculate 10% off. Then 25% off. Then 50% off. Which deal is best? By how much?','financial_literacy',15,'indoor','solo',1,1,ARRAY['paper','calculator'],ARRAY[]::text[],5,12,4),
  ('Price Comparison Shopper','Same item costs $8.99 at one store and $7.49 at another. You need 3 of them. How much do you save buying from the cheaper store?','financial_literacy',10,'indoor','solo',1,1,ARRAY['paper','pencil'],ARRAY[]::text[],5,12,4),
  -- Level 5 — Savings Goals & Banking Basics
  ('Savings Goal Tracker','Pick something you want that costs $50. If you save $5/week, how many weeks until you can buy it? Make a tracker chart.','financial_literacy',15,'indoor','solo',1,1,ARRAY['paper','pencil or ruler'],ARRAY[]::text[],6,12,5),
  ('Checking vs. Savings — What is the Difference?','Talk about: checking = spending money (debit card), savings = money you are keeping. Why keep them separate?','financial_literacy',10,'indoor','any',1,4,ARRAY[]::text[],ARRAY['verbal_required'],6,12,5),
  ('Simple Interest Explorer','If you put $100 in a savings account that earns 2% per year, how much do you have after 1 year? After 5 years?','financial_literacy',15,'indoor','solo',1,1,ARRAY['paper','calculator'],ARRAY[]::text[],7,12,5),
  ('Wants vs. Needs Sort','Write 10 items on cards. Sort into Needs and Wants.','financial_literacy',10,'indoor','any',1,4,ARRAY['index cards'],ARRAY[]::text[],4,12,5),
  -- Level 6 — Adult Real-World Costs
  ('The Real Cost of a Car','A car payment is $250/month. Insurance is $120/month. Gas is $80/month. Tabs $25/month. What does owning that car cost per month total? Per year?','financial_literacy',15,'indoor','solo',1,1,ARRAY['paper','calculator'],ARRAY[]::text[],9,12,6),
  ('What Is the IRS?','When you earn money at a job, the government takes a percentage for taxes. Read a sample pay stub together. Find: gross pay, taxes withheld, net pay.','financial_literacy',20,'indoor','partner',2,2,ARRAY['printed sample pay stub'],ARRAY[]::text[],9,12,6),
  ('Renter''s Math','A 1-bedroom apartment is $950/month. Add electricity, internet, renter''s insurance, groceries. How much do you need to earn per month?','financial_literacy',15,'indoor','solo',1,1,ARRAY['paper','calculator'],ARRAY[]::text[],9,12,6),
  ('Read a Pay Stub','Given a sample pay stub — find the gross pay, identify each deduction, and calculate the net pay.','financial_literacy',20,'indoor','solo',1,1,ARRAY['printed sample pay stub'],ARRAY[]::text[],9,12,6),
  ('Credit Card Danger Math','You charge $500 on a credit card with 20% annual interest. If you only pay the minimum ($25/month), how long to pay it off?','financial_literacy',15,'indoor','partner',2,2,ARRAY['paper','calculator'],ARRAY[]::text[],9,12,6),
  ('Car Insurance 101','What is liability vs. comprehensive coverage? Why does a 17-year-old pay more? What happens if you drive without it?','financial_literacy',15,'indoor','partner',2,2,ARRAY[]::text[],ARRAY['verbal_required'],9,12,6)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 13. SEED ENRICHMENT ACTIVITIES — ART (15)
-- ============================================================================
INSERT INTO enrichment_activities (title, description, subject, duration_min, location, solo_or_group, min_players, max_players, materials, accessibility_conflicts, grade_min, grade_max) VALUES
  ('Zentangle Tile — Math Patterns','Draw a 4x4 grid. Fill each square with a different repeating pattern (dots, lines, waves, crosses).','art',20,'indoor','solo',1,1,ARRAY['paper','fine-tip marker or pencil'],ARRAY[]::text[],1,12),
  ('Nature Print — Leaf Rubbings','Collect 5 different leaves. Place under paper, rub with crayon or pencil to reveal the texture and veins.','art',15,'either','solo',1,1,ARRAY['leaves','paper','crayons'],ARRAY[]::text[],1,12),
  ('Watercolor Resist','Draw with white crayon on paper. Paint over with watercolor. Watch the drawing appear.','art',20,'indoor','solo',1,1,ARRAY['white crayon','watercolor paints','paper'],ARRAY[]::text[],1,12),
  ('Self Portrait — No Mirror Allowed','Draw yourself from memory. Then compare to the mirror. What did you get right? What is funny?','art',15,'indoor','solo',1,1,ARRAY['paper','pencil'],ARRAY[]::text[],1,12),
  ('Contour Drawing','Pick an object. Draw it without lifting your pencil and without looking at the paper. Try 3 times.','art',15,'indoor','solo',1,1,ARRAY['paper','pencil','any object'],ARRAY[]::text[],1,12),
  ('Color Mixing Lab','Start with just red, blue, and yellow paint. Mix every combination you can. Name the colors you make. Chart them.','art',20,'indoor','solo',1,1,ARRAY['red blue yellow paint','paper'],ARRAY[]::text[],1,12),
  ('Geometric Art — Ruler Designs','Use only a ruler and pencil to create a pattern. Fill the shapes with different patterns or colors.','art',20,'indoor','solo',1,1,ARRAY['paper','ruler','pencil','optional colors'],ARRAY[]::text[],1,12),
  ('Clay or Play-Doh Sculpture','Sculpt any animal, food, or object from clay or play-doh. Add texture details.','art',20,'indoor','solo',1,1,ARRAY['clay or play-doh'],ARRAY[]::text[],1,12),
  ('Cultural Pattern Art','Research a traditional pattern from one country. Recreate it. (Japanese origami, African kente, Mexican papel picado, etc.)','art',30,'indoor','solo',1,1,ARRAY['paper','colored pencils'],ARRAY[]::text[],1,12),
  ('Origami — 1 Figure','Learn one origami fold from a YouTube video or instruction sheet. Complete it. Try to teach a sibling.','art',20,'indoor','any',1,4,ARRAY['square paper'],ARRAY[]::text[],1,12),
  ('Collage — Nature Finds','Collect leaves, seeds, small rocks, sticks from outside. Arrange on paper to create a picture or pattern. Glue down.','art',30,'either','solo',1,1,ARRAY['nature items','paper','glue'],ARRAY[]::text[],1,12),
  ('Observation Sketch — 5 Min Timer','Set a 5-minute timer. Sketch any object in front of you as accurately as possible. No erasing.','art',5,'indoor','solo',1,1,ARRAY['paper','pencil'],ARRAY[]::text[],1,12),
  ('Comic Character Design','Design your own superhero or fantasy character. Draw them, name them, write 3 powers and 1 weakness.','art',20,'indoor','solo',1,1,ARRAY['paper','pencil','colors'],ARRAY[]::text[],1,12),
  ('Watercolor Emotions','Paint 4 small boxes. Paint each one to represent a different emotion — use color and brush strokes only, no words.','art',15,'indoor','solo',1,1,ARRAY['watercolor paints','paper'],ARRAY[]::text[],1,12),
  ('Book Cover Redesign','Pick a book you are currently reading. Design a new cover for it. What image or style would you choose?','art',20,'indoor','solo',1,1,ARRAY['paper','colored pencils or markers'],ARRAY[]::text[],1,12)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 14. SEED ENRICHMENT ACTIVITIES — PE / OUTDOOR (20)
-- ============================================================================
INSERT INTO enrichment_activities (title, description, subject, duration_min, location, solo_or_group, min_players, max_players, materials, accessibility_conflicts, grade_min, grade_max) VALUES
  ('Nature Walk — Observation Focus','Walk to the river or woods. Walk slowly. Stop every 3 minutes and observe for 1 minute. What do you notice?','pe_outdoor',30,'outdoor','any',1,4,ARRAY[]::text[],ARRAY[]::text[],1,12),
  ('Backyard Obstacle Course','Build an obstacle course using what you have. Jump over a stick, crawl under a table, balance on a board. Time yourself.','pe_outdoor',20,'outdoor','group',2,4,ARRAY['household items'],ARRAY[]::text[],1,12),
  ('Freeze Dance Science','Play music. When it stops, everyone freezes and names one science fact. Keep going.','pe_outdoor',15,'either','group',2,4,ARRAY[]::text[],ARRAY['verbal_required'],1,12),
  ('Jump Rope Skip Count','Jump rope and skip count by 2s, 3s, 5s, or 10s. Miss the jump = switch counters.','pe_outdoor',10,'outdoor','group',2,4,ARRAY['jump rope'],ARRAY[]::text[],1,12),
  ('Scavenger Hunt at the River','Find: 3 smooth rocks, 1 feather, something green, something that floats, 1 living thing. First to find all 5 wins.','pe_outdoor',30,'outdoor','group',2,4,ARRAY[]::text[],ARRAY[]::text[],1,12),
  ('Four Corners (Body Spelling)','Tape cardinal directions to the walls. Call out a word. Kids run to the letter that the word starts with.','pe_outdoor',15,'indoor','group',2,4,ARRAY['tape'],ARRAY[]::text[],1,4),
  ('Balance Beam Walk','Put a strip of tape on the floor. Walk it forward, backward, with eyes closed, on one foot. Set challenges.','pe_outdoor',10,'indoor','any',1,4,ARRAY['tape'],ARRAY[]::text[],1,12),
  ('Animal Movement Math','Roll a die. Move that many spaces like an animal — hop like a frog, slither like a snake, gallop like a horse.','pe_outdoor',10,'either','group',2,4,ARRAY['die'],ARRAY[]::text[],1,12),
  ('Nature Art Installation','Collect natural materials outside. Use them to create temporary art on the ground. Photograph it.','pe_outdoor',30,'outdoor','group',2,4,ARRAY['camera or phone'],ARRAY[]::text[],1,12),
  ('Bike Ride or Walk Log','Go for a 20-minute walk or ride. Count: how many birds you see, how many cars pass, how many different trees.','pe_outdoor',20,'outdoor','group',2,4,ARRAY[]::text[],ARRAY[]::text[],1,12),
  ('Frisbee Math Facts','Before throwing the Frisbee, the thrower calls out a math problem. Catcher must answer before catching.','pe_outdoor',15,'outdoor','partner',2,2,ARRAY['Frisbee'],ARRAY[]::text[],1,12),
  ('Nature Journaling at the Park','Bring a journal to the park or river. Sit quietly for 15 minutes. Draw and label 3 things you observe.','pe_outdoor',20,'outdoor','solo',1,1,ARRAY['journal','pencil'],ARRAY[]::text[],1,12),
  ('Alphabet Nature Hunt','Find something that begins with each letter of the alphabet outside. How far can you get?','pe_outdoor',20,'outdoor','any',1,4,ARRAY[]::text[],ARRAY[]::text[],1,12),
  ('Water Balloon Science','Fill balloons with different amounts of water. Drop from different heights. Observe what happens. Is it about height or weight?','pe_outdoor',20,'outdoor','group',2,4,ARRAY['water balloons'],ARRAY[]::text[],1,12),
  ('Yoga + Body Awareness','Follow a simple 10-minute kids yoga routine. Focus on breathing. Notice how your body feels after.','pe_outdoor',10,'indoor','any',1,4,ARRAY[]::text[],ARRAY[]::text[],1,12),
  ('Sidewalk Chalk Math Town','Draw a whole neighborhood in chalk outside. Label buildings with addresses, prices in store windows. Walk through your town.','pe_outdoor',30,'outdoor','group',2,4,ARRAY['sidewalk chalk'],ARRAY[]::text[],1,12),
  ('Relay Races — Vocab Edition','Run to a cone and back. When you return, say a vocab word and its definition. Pass the baton.','pe_outdoor',15,'outdoor','group',2,4,ARRAY[]::text[],ARRAY['verbal_required'],1,12),
  ('Cloud Shapes + Stories','Lie on the grass and watch clouds for 10 minutes. Find shapes. Make up a one-sentence story about each.','pe_outdoor',10,'outdoor','group',2,4,ARRAY[]::text[],ARRAY[]::text[],1,12),
  ('Balance + Breathe','Stand on one foot for 30 seconds. Switch. Then try with eyes closed. Practice 3 times. Does deep breathing help you balance?','pe_outdoor',10,'either','solo',1,1,ARRAY[]::text[],ARRAY[]::text[],1,12),
  ('Compass Walk','Using a real compass or phone compass, walk exactly 20 steps North, then 20 East, then 20 South, then 20 West. Where do you end up?','pe_outdoor',15,'outdoor','any',1,4,ARRAY['compass or phone'],ARRAY[]::text[],1,12)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 15. SEED HOME LIBRARY — Known Items
-- ============================================================================
INSERT INTO home_library (item_type, title, author_or_publisher, grade_min, grade_max, subject_tags, edu_uses, who_uses, accessibility_flags, location_in_home) VALUES
  ('book','IXL Ultimate Second Grade Math Workbook','IXL Learning',2,2,ARRAY['math'],ARRAY['math foundation','multistep problems','number sense'],ARRAY['amos'],ARRAY['math_heavy'],'school area'),
  ('book','Summer Bridge Activities Grades 1 to 2','Carson Dellosa',1,2,ARRAY['math','elar','science','social_studies'],ARRAY[]::text[],ARRAY['amos'],ARRAY[]::text[],'school area'),
  ('book','IXL Ultimate Fourth Grade Math Workbook','IXL Learning',4,4,ARRAY['math'],ARRAY[]::text[],ARRAY['wyatt'],ARRAY['math_heavy'],'school area'),
  ('book','Summer Bridge Activities Grades 4 to 5','Carson Dellosa',4,5,ARRAY['math','elar','science','social_studies'],ARRAY[]::text[],ARRAY['wyatt'],ARRAY[]::text[],'school area'),
  ('book','IXL Ultimate Fifth Grade Math Workbook','IXL Learning',5,5,ARRAY['math'],ARRAY[]::text[],ARRAY['ellie'],ARRAY['math_heavy'],'school area'),
  ('book','Summer Bridge Activities Grades 5 to 6','Carson Dellosa',5,6,ARRAY['math','elar','science','social_studies'],ARRAY[]::text[],ARRAY['ellie'],ARRAY[]::text[],'school area'),
  ('book','IXL Ultimate Third Grade Math Workbook','IXL Learning',3,3,ARRAY['math'],ARRAY[]::text[],ARRAY['hannah'],ARRAY['math_heavy'],'school area'),
  ('book','Summer Bridge Activities Grades 2 to 3','Carson Dellosa',2,3,ARRAY['math','elar','science','social_studies'],ARRAY[]::text[],ARRAY['hannah'],ARRAY[]::text[],'school area'),
  ('book','Olive''s Ocean','Kevin Henkes',5,8,ARRAY['elar'],ARRAY['vocabulary','character analysis','theme discussion','writing prompts','flashcard vocab set (in-app)'],ARRAY['amos','ellie','wyatt','hannah'],ARRAY[]::text[],'school area'),
  ('resource','Olive''s Ocean Vocabulary Flashcards — Pink Set',NULL,NULL,NULL,ARRAY['elar'],ARRAY['vocabulary','definition match','flashcard duel game'],ARRAY['amos','ellie','wyatt','hannah'],ARRAY[]::text[],'school area'),
  ('resource','Olive''s Ocean Vocabulary Flashcards — Blue Set',NULL,NULL,NULL,ARRAY['elar'],ARRAY['vocabulary','definition match','flashcard duel game'],ARRAY['amos','ellie','wyatt','hannah'],ARRAY[]::text[],'school area')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 16. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_enrichment_subject ON enrichment_activities(subject);
CREATE INDEX IF NOT EXISTS idx_enrichment_active ON enrichment_activities(active);
CREATE INDEX IF NOT EXISTS idx_enrichment_financial_level ON enrichment_activities(financial_level);
CREATE INDEX IF NOT EXISTS idx_kid_enrichment_log_kid ON kid_enrichment_log(kid_name, date);
CREATE INDEX IF NOT EXISTS idx_kid_enrichment_log_activity ON kid_enrichment_log(activity_id);
CREATE INDEX IF NOT EXISTS idx_typing_sessions_kid ON typing_sessions(kid_name, session_date);
CREATE INDEX IF NOT EXISTS idx_home_library_type ON home_library(item_type);
CREATE INDEX IF NOT EXISTS idx_home_library_active ON home_library(active, archived);
CREATE INDEX IF NOT EXISTS idx_library_search_log_kid ON library_search_log(kid_name);
CREATE INDEX IF NOT EXISTS idx_typing_passages_band ON typing_passages(grade_band, active);
