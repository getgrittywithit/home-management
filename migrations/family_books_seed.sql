-- Family Book Library Seed Data
-- Cataloged from bookshelf photos, April 12, 2026
-- Seeded into home_library table
-- 95 books across multiple shelves

-- ============================================================================
-- HARRY POTTER SERIES — J.K. Rowling (Paperback box set + Hardcovers + MinaLima)
-- Grade range: 3-8 | All kids can read/grow into these
-- ============================================================================
INSERT INTO home_library (id, item_type, title, author_or_publisher, grade_min, grade_max, subject_tags, edu_uses, who_uses, location_in_home, condition, added_by)
VALUES
  (gen_random_uuid(), 'book', 'Harry Potter and the Sorcerer''s Stone', 'J.K. Rowling', 3, 8, ARRAY['elar'], ARRAY['reading comprehension', 'vocabulary', 'read aloud'], ARRAY['amos','ellie','wyatt','hannah'], 'bookshelf', 'great', 'parent'),
  (gen_random_uuid(), 'book', 'Harry Potter and the Chamber of Secrets', 'J.K. Rowling', 3, 8, ARRAY['elar'], ARRAY['reading comprehension', 'vocabulary'], ARRAY['amos','ellie','wyatt','hannah'], 'bookshelf', 'great', 'parent'),
  (gen_random_uuid(), 'book', 'Harry Potter and the Prisoner of Azkaban', 'J.K. Rowling', 3, 8, ARRAY['elar'], ARRAY['reading comprehension', 'vocabulary'], ARRAY['amos','ellie','wyatt','hannah'], 'bookshelf', 'great', 'parent'),
  (gen_random_uuid(), 'book', 'Harry Potter and the Goblet of Fire', 'J.K. Rowling', 4, 8, ARRAY['elar'], ARRAY['reading comprehension', 'vocabulary'], ARRAY['amos','ellie','wyatt','hannah'], 'bookshelf', 'great', 'parent'),
  (gen_random_uuid(), 'book', 'Harry Potter and the Order of the Phoenix', 'J.K. Rowling', 4, 8, ARRAY['elar'], ARRAY['reading comprehension', 'vocabulary'], ARRAY['amos','ellie','wyatt','hannah'], 'bookshelf', 'great', 'parent'),
  (gen_random_uuid(), 'book', 'Harry Potter and the Half-Blood Prince', 'J.K. Rowling', 5, 8, ARRAY['elar'], ARRAY['reading comprehension', 'vocabulary'], ARRAY['amos','ellie','wyatt','hannah'], 'bookshelf', 'great', 'parent'),
  (gen_random_uuid(), 'book', 'Harry Potter and the Deathly Hallows', 'J.K. Rowling', 5, 8, ARRAY['elar'], ARRAY['reading comprehension', 'vocabulary'], ARRAY['amos','ellie','wyatt','hannah'], 'bookshelf', 'great', 'parent'),
  (gen_random_uuid(), 'book', 'Harry Potter and the Sorcerer''s Stone (MinaLima Illustrated)', 'J.K. Rowling / MinaLima', 3, 8, ARRAY['elar', 'art'], ARRAY['reading comprehension', 'visual literacy'], ARRAY['amos','ellie','wyatt','hannah'], 'bookshelf', 'great', 'parent');

-- ============================================================================
-- THE INHERITANCE CYCLE — Christopher Paolini
-- Grade range: 5-10 | Amos, Ellie
-- ============================================================================
INSERT INTO home_library (id, item_type, title, author_or_publisher, grade_min, grade_max, subject_tags, edu_uses, who_uses, location_in_home, condition, added_by)
VALUES
  (gen_random_uuid(), 'book', 'Eragon', 'Christopher Paolini', 5, 10, ARRAY['elar'], ARRAY['reading comprehension', 'vocabulary', 'independent reading'], ARRAY['amos','ellie'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Eldest', 'Christopher Paolini', 5, 10, ARRAY['elar'], ARRAY['reading comprehension', 'vocabulary', 'independent reading'], ARRAY['amos','ellie'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Brisingr', 'Christopher Paolini', 5, 10, ARRAY['elar'], ARRAY['reading comprehension', 'vocabulary', 'independent reading'], ARRAY['amos','ellie'], 'bookshelf', 'good', 'parent');

-- ============================================================================
-- THE LAND OF STORIES — Chris Colfer (Books 2-6, missing Book 1)
-- Grade range: 3-7 | Ellie, Hannah growing into it
-- ============================================================================
INSERT INTO home_library (id, item_type, title, author_or_publisher, grade_min, grade_max, subject_tags, edu_uses, who_uses, location_in_home, condition, added_by)
VALUES
  (gen_random_uuid(), 'book', 'The Land of Stories: The Enchantress Returns', 'Chris Colfer', 3, 7, ARRAY['elar'], ARRAY['reading comprehension', 'vocabulary', 'independent reading'], ARRAY['ellie','hannah'], 'bookshelf', 'great', 'parent'),
  (gen_random_uuid(), 'book', 'The Land of Stories: A Grimm Warning', 'Chris Colfer', 3, 7, ARRAY['elar'], ARRAY['reading comprehension', 'vocabulary'], ARRAY['ellie','hannah'], 'bookshelf', 'great', 'parent'),
  (gen_random_uuid(), 'book', 'The Land of Stories: Beyond the Kingdoms', 'Chris Colfer', 3, 7, ARRAY['elar'], ARRAY['reading comprehension', 'vocabulary'], ARRAY['ellie','hannah'], 'bookshelf', 'great', 'parent'),
  (gen_random_uuid(), 'book', 'The Land of Stories: An Author''s Odyssey', 'Chris Colfer', 3, 7, ARRAY['elar'], ARRAY['reading comprehension', 'vocabulary'], ARRAY['ellie','hannah'], 'bookshelf', 'great', 'parent'),
  (gen_random_uuid(), 'book', 'The Land of Stories: Worlds Collide', 'Chris Colfer', 3, 7, ARRAY['elar'], ARRAY['reading comprehension', 'vocabulary'], ARRAY['ellie','hannah'], 'bookshelf', 'great', 'parent');

-- ============================================================================
-- ANIMAL ARK SERIES — Ben M. Baglio (6 books)
-- Grade range: 2-4 | Hannah, Wyatt
-- ============================================================================
INSERT INTO home_library (id, item_type, title, author_or_publisher, grade_min, grade_max, subject_tags, edu_uses, who_uses, location_in_home, condition, added_by)
VALUES
  (gen_random_uuid(), 'book', 'Animal Ark: Puppies in the Pantry', 'Ben M. Baglio', 2, 4, ARRAY['elar', 'science'], ARRAY['reading comprehension', 'animal care'], ARRAY['hannah','wyatt'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Animal Ark: Tabby in the Tub', 'Ben M. Baglio', 2, 4, ARRAY['elar', 'science'], ARRAY['reading comprehension', 'animal care'], ARRAY['hannah','wyatt'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Animal Ark: Husky in a Hut', 'Ben M. Baglio', 2, 4, ARRAY['elar', 'science'], ARRAY['reading comprehension', 'animal care'], ARRAY['hannah','wyatt'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Animal Ark: Hamster in a Handbasket', 'Ben M. Baglio', 2, 4, ARRAY['elar', 'science'], ARRAY['reading comprehension', 'animal care'], ARRAY['hannah','wyatt'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Animal Ark: Ponies at the Point', 'Ben M. Baglio', 2, 4, ARRAY['elar', 'science'], ARRAY['reading comprehension', 'animal care'], ARRAY['hannah','wyatt'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Animal Ark: Foals in the Field', 'Ben M. Baglio', 2, 4, ARRAY['elar', 'science'], ARRAY['reading comprehension', 'animal care'], ARRAY['hannah','wyatt'], 'bookshelf', 'good', 'parent');

-- ============================================================================
-- DOG & ANIMAL STORIES — Mixed authors (stacked books)
-- Grade range: 3-6 | Hannah (animal lover), Ellie
-- ============================================================================
INSERT INTO home_library (id, item_type, title, author_or_publisher, grade_min, grade_max, subject_tags, edu_uses, who_uses, location_in_home, condition, added_by)
VALUES
  (gen_random_uuid(), 'book', 'Dog Diaries: Togo', 'Kate Klimo', 3, 5, ARRAY['elar', 'social_studies'], ARRAY['reading comprehension', 'history'], ARRAY['hannah','ellie'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Old Yeller', 'Fred Gipson', 4, 7, ARRAY['elar'], ARRAY['reading comprehension', 'vocabulary', 'classic literature'], ARRAY['hannah','ellie','wyatt'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Craig & Fred: Young Readers'' Edition', 'Craig Grossi', 3, 6, ARRAY['elar', 'social_studies'], ARRAY['reading comprehension', 'character education'], ARRAY['hannah','ellie','wyatt'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Animal Heroes', 'Karleen Bradford', 3, 6, ARRAY['elar', 'science'], ARRAY['reading comprehension', 'nonfiction'], ARRAY['hannah','ellie'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Dog to the Rescue II', 'Jeannette Sanderson', 3, 5, ARRAY['elar'], ARRAY['reading comprehension', 'nonfiction'], ARRAY['hannah','ellie'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'My Life in Dog Years', 'Gary Paulsen', 4, 7, ARRAY['elar'], ARRAY['reading comprehension', 'memoir'], ARRAY['hannah','ellie','wyatt'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'War Dog Heroes', 'Jeannette Sanderson', 3, 6, ARRAY['elar', 'social_studies'], ARRAY['reading comprehension', 'nonfiction', 'history'], ARRAY['hannah','ellie','wyatt'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'More Animal Heroes', 'Karleen Bradford', 3, 6, ARRAY['elar', 'science'], ARRAY['reading comprehension', 'nonfiction'], ARRAY['hannah','ellie'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Maggie & Oliver, or A Bone of One''s Own', 'Valerie Hobbs', 3, 5, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah','ellie'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Bailey''s Story: A Dog''s Purpose Novel', 'W. Bruce Cameron', 3, 6, ARRAY['elar'], ARRAY['reading comprehension', 'independent reading'], ARRAY['hannah','ellie'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Bad Pets: True Tales of Misbehaving Animals', 'Allan Zullo', 3, 5, ARRAY['elar'], ARRAY['reading comprehension', 'nonfiction'], ARRAY['hannah','wyatt','ellie'], 'bookshelf', 'good', 'parent');

-- ============================================================================
-- MAGIC PUPPY — Sue Bentley (2 books)
-- Grade range: 2-4 | Hannah
-- ============================================================================
INSERT INTO home_library (id, item_type, title, author_or_publisher, grade_min, grade_max, subject_tags, edu_uses, who_uses, location_in_home, condition, added_by)
VALUES
  (gen_random_uuid(), 'book', 'Magic Puppy: School of Mischief', 'Sue Bentley', 2, 4, ARRAY['elar'], ARRAY['reading comprehension', 'independent reading'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Magic Puppy: Spellbound at School', 'Sue Bentley', 2, 4, ARRAY['elar'], ARRAY['reading comprehension', 'independent reading'], ARRAY['hannah'], 'bookshelf', 'good', 'parent');

-- ============================================================================
-- MISC CHAPTER BOOKS — Single titles
-- ============================================================================
INSERT INTO home_library (id, item_type, title, author_or_publisher, grade_min, grade_max, subject_tags, edu_uses, who_uses, location_in_home, condition, added_by)
VALUES
  (gen_random_uuid(), 'book', 'Class Dismissed', 'Woodrow', 3, 5, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah','wyatt','ellie'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Pet Hotel: Calling All Pets!', 'Kate Finch', 2, 4, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'The Puppy Place: Buddy', 'Ellen Miles', 2, 4, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Misty the Abandoned Kitten', 'Holly Webb', 2, 4, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'The Storm Dragon', 'Paula Harrison', 2, 4, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah','wyatt'], 'bookshelf', 'good', 'parent');

-- ============================================================================
-- PURRMAIDS — Sudipta Bardhan-Quallen (5 books)
-- Grade range: 1-3 | Hannah
-- ============================================================================
INSERT INTO home_library (id, item_type, title, author_or_publisher, grade_min, grade_max, subject_tags, edu_uses, who_uses, location_in_home, condition, added_by)
VALUES
  (gen_random_uuid(), 'book', 'Purrmaids: The Scaredy Cat', 'Sudipta Bardhan-Quallen', 1, 3, ARRAY['elar'], ARRAY['reading comprehension', 'independent reading'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Purrmaids: The Catfish Club', 'Sudipta Bardhan-Quallen', 1, 3, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Purrmaids: Quest for Clean Water', 'Sudipta Bardhan-Quallen', 1, 3, ARRAY['elar', 'science'], ARRAY['reading comprehension', 'environmental science'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Purrmaids: A Purr-fect Pumpkin', 'Sudipta Bardhan-Quallen', 1, 3, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Purrmaids #6', 'Sudipta Bardhan-Quallen', 1, 3, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent');

-- ============================================================================
-- MAGIC PONY CAROUSEL — Poppy Shire (4 books)
-- Grade range: 1-3 | Hannah
-- ============================================================================
INSERT INTO home_library (id, item_type, title, author_or_publisher, grade_min, grade_max, subject_tags, edu_uses, who_uses, location_in_home, condition, added_by)
VALUES
  (gen_random_uuid(), 'book', 'Magic Pony Carousel: Sparkle the Circus Pony', 'Poppy Shire', 1, 3, ARRAY['elar'], ARRAY['reading comprehension', 'independent reading'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Magic Pony Carousel: Brightheart the Knight''s Pony', 'Poppy Shire', 1, 3, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Magic Pony Carousel: Star the Western Pony', 'Poppy Shire', 1, 3, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Magic Pony Carousel: Jewel the Midnight Pony', 'Poppy Shire', 1, 3, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent');

-- ============================================================================
-- FAIRY PONIES (Usborne) — Zanna Davidson (8 books)
-- Grade range: 1-3 | Hannah
-- ============================================================================
INSERT INTO home_library (id, item_type, title, author_or_publisher, grade_min, grade_max, subject_tags, edu_uses, who_uses, location_in_home, condition, added_by)
VALUES
  (gen_random_uuid(), 'book', 'Fairy Ponies: Unicorn Prince', 'Zanna Davidson / Usborne', 1, 3, ARRAY['elar'], ARRAY['reading comprehension', 'independent reading'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Fairy Ponies: Rainbow Races', 'Zanna Davidson / Usborne', 1, 3, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Fairy Ponies: Midnight Escape', 'Zanna Davidson / Usborne', 1, 3, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Fairy Ponies: Enchanted Mirror', 'Zanna Davidson / Usborne', 1, 3, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Fairy Ponies: Magic Necklace', 'Zanna Davidson / Usborne', 1, 3, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Fairy Ponies: Pony Princess', 'Zanna Davidson / Usborne', 1, 3, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Fairy Ponies: Seaside Adventure', 'Zanna Davidson / Usborne', 1, 3, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Fairy Ponies: Enchanted Shell', 'Zanna Davidson / Usborne', 1, 3, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent');

-- ============================================================================
-- THE PONY-CRAZED PRINCESS — Diana Kimpton (3 books)
-- Grade range: 2-4 | Hannah
-- ============================================================================
INSERT INTO home_library (id, item_type, title, author_or_publisher, grade_min, grade_max, subject_tags, edu_uses, who_uses, location_in_home, condition, added_by)
VALUES
  (gen_random_uuid(), 'book', 'The Pony-Crazed Princess: A Puzzle for Princess Ellie', 'Diana Kimpton', 2, 4, ARRAY['elar'], ARRAY['reading comprehension', 'independent reading'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'The Pony-Crazed Princess: Princess Ellie''s Secret', 'Diana Kimpton', 2, 4, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'The Pony-Crazed Princess: Princess Ellie to the Rescue', 'Diana Kimpton', 2, 4, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent');

-- ============================================================================
-- PRINCESS PONIES — Chloe Ryder (1 book visible)
-- Grade range: 2-4 | Hannah
-- ============================================================================
INSERT INTO home_library (id, item_type, title, author_or_publisher, grade_min, grade_max, subject_tags, edu_uses, who_uses, location_in_home, condition, added_by)
VALUES
  (gen_random_uuid(), 'book', 'Princess Ponies: A Dream Come True', 'Chloe Ryder', 2, 4, ARRAY['elar'], ARRAY['reading comprehension', 'independent reading'], ARRAY['hannah'], 'bookshelf', 'good', 'parent');

-- ============================================================================
-- MY SECRET UNICORN / SECRET RESCUERS / STAR FRIENDS — Linda Chapman
-- Grade range: 2-4 | Hannah
-- ============================================================================
INSERT INTO home_library (id, item_type, title, author_or_publisher, grade_min, grade_max, subject_tags, edu_uses, who_uses, location_in_home, condition, added_by)
VALUES
  (gen_random_uuid(), 'book', 'My Secret Unicorn: The Magic Spell', 'Linda Chapman', 2, 4, ARRAY['elar'], ARRAY['reading comprehension', 'independent reading'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Star Friends #6', 'Linda Chapman', 2, 4, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent');

-- ============================================================================
-- DOLPHIN SCHOOL — Catherine Hapka (2 books)
-- Grade range: 1-3 | Hannah
-- ============================================================================
INSERT INTO home_library (id, item_type, title, author_or_publisher, grade_min, grade_max, subject_tags, edu_uses, who_uses, location_in_home, condition, added_by)
VALUES
  (gen_random_uuid(), 'book', 'Dolphin School: Echo''s New Pet', 'Catherine Hapka', 1, 3, ARRAY['elar', 'science'], ARRAY['reading comprehension', 'marine life'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Dolphin School: Pearl''s Perfect Gift', 'Catherine Hapka', 1, 3, ARRAY['elar', 'science'], ARRAY['reading comprehension', 'marine life'], ARRAY['hannah'], 'bookshelf', 'good', 'parent');

-- ============================================================================
-- FAIRY ANIMALS — Lily Small (3 books visible)
-- Grade range: 1-3 | Hannah
-- ============================================================================
INSERT INTO home_library (id, item_type, title, author_or_publisher, grade_min, grade_max, subject_tags, edu_uses, who_uses, location_in_home, condition, added_by)
VALUES
  (gen_random_uuid(), 'book', 'Fairy Animals: Chloe the Kitten', 'Lily Small', 1, 3, ARRAY['elar'], ARRAY['reading comprehension', 'independent reading'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Fairy Animals: Sophie the Squirrel', 'Lily Small', 1, 3, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Fairy Animals: Paddy the Puppy', 'Lily Small', 1, 3, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent');

-- ============================================================================
-- DISNEY FAIRIES / RAINBOW MAGIC — Various
-- Grade range: 2-4 | Hannah
-- ============================================================================
INSERT INTO home_library (id, item_type, title, author_or_publisher, grade_min, grade_max, subject_tags, edu_uses, who_uses, location_in_home, condition, added_by)
VALUES
  (gen_random_uuid(), 'book', 'Disney Fairies: Tink, North of Never Land', 'Disney / Kiki Thorpe', 2, 4, ARRAY['elar'], ARRAY['reading comprehension', 'independent reading'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Disney Fairies: Rani in the Mermaid Lagoon', 'Disney / Lisa Papademetriou', 2, 4, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Goldie the Sunshine Fairy (Rainbow Magic: Weather Fairies)', 'Daisy Meadows', 2, 4, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'The Secret Mermaid: A Masterpiece for Bess', 'Sue Mongredien', 2, 4, ARRAY['elar'], ARRAY['reading comprehension'], ARRAY['hannah'], 'bookshelf', 'good', 'parent');

-- ============================================================================
-- OTHER SERIES — Misc kids shelf
-- ============================================================================
INSERT INTO home_library (id, item_type, title, author_or_publisher, grade_min, grade_max, subject_tags, edu_uses, who_uses, location_in_home, condition, added_by)
VALUES
  (gen_random_uuid(), 'book', 'Tanglewood Animal Park: Baby Zebra Rescue', 'Tamsyn Murray', 2, 4, ARRAY['elar', 'science'], ARRAY['reading comprehension', 'animal care'], ARRAY['hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Zoey and Sassafras #2', 'Asia Citro', 2, 4, ARRAY['elar', 'science'], ARRAY['reading comprehension', 'STEM'], ARRAY['hannah','wyatt'], 'bookshelf', 'good', 'parent');

-- ============================================================================
-- EDUCATIONAL / REFERENCE — Stacked books (Photo 8)
-- Grade range: 4 | Wyatt (4th grade homeschool)
-- ============================================================================
INSERT INTO home_library (id, item_type, title, author_or_publisher, grade_min, grade_max, subject_tags, edu_uses, who_uses, location_in_home, condition, added_by)
VALUES
  (gen_random_uuid(), 'book', 'The Fourth Grade Reader', 'Curious Bee', 4, 4, ARRAY['elar'], ARRAY['reading comprehension', 'curriculum', 'phonics'], ARRAY['wyatt'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Communities Near and Far', 'Felton-Koestler / Koestler', 3, 5, ARRAY['social_studies'], ARRAY['social studies', 'community', 'curriculum'], ARRAY['wyatt','hannah'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Level Up: Secrets of the Games We Love', 'Kaitlyn Duling', 3, 6, ARRAY['elar', 'science'], ARRAY['reading comprehension', 'nonfiction', 'technology'], ARRAY['wyatt','ellie'], 'bookshelf', 'good', 'parent'),
  (gen_random_uuid(), 'book', 'Travel To... Coolest Collections', 'Kaitlyn Duling', 3, 5, ARRAY['elar', 'social_studies'], ARRAY['reading comprehension', 'nonfiction', 'geography'], ARRAY['wyatt','hannah'], 'bookshelf', 'good', 'parent');
