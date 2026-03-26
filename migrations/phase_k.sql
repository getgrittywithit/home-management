CREATE TABLE IF NOT EXISTS achievement_definitions (
  id SERIAL PRIMARY KEY, key TEXT NOT NULL UNIQUE, title TEXT NOT NULL, description TEXT NOT NULL,
  emoji TEXT NOT NULL, category TEXT NOT NULL, trigger_type TEXT NOT NULL, trigger_value INTEGER, trigger_metric TEXT
);

INSERT INTO achievement_definitions (key,title,description,emoji,category,trigger_type,trigger_value,trigger_metric) VALUES
  ('reading_7','Bookworm','7 days reading','📚','reading','streak_milestone',7,'reading_streak'),
  ('reading_14','Story Keeper','14 days reading','📖','reading','streak_milestone',14,'reading_streak'),
  ('reading_30','Reading Legend','30 days reading','🏆','reading','streak_milestone',30,'reading_streak'),
  ('books_5','Page Turner','Finished 5 books','📕','reading','count_milestone',5,'books_completed'),
  ('books_10','Bibliophile','Finished 10 books','📚','reading','count_milestone',10,'books_completed'),
  ('dental_7','Smile Keeper','7-day dental streak','🦷','health','streak_milestone',7,'dental_streak'),
  ('dental_30','Cavity Fighter','30-day dental streak','✨','health','streak_milestone',30,'dental_streak'),
  ('dental_100','Dental Legend','100-day dental streak','🏅','health','streak_milestone',100,'dental_streak'),
  ('chore_7','Consistent','7-day chore streak','⭐','chores','streak_milestone',7,'chore_streak'),
  ('chore_14','Reliable','14-day chore streak','💪','chores','streak_milestone',14,'chore_streak'),
  ('chore_30','Rock Solid','30-day chore streak','🏆','chores','streak_milestone',30,'chore_streak'),
  ('perfect_day_1','All-Star Day','100% tasks in a day','🌟','chores','perfect_day',1,NULL),
  ('activity_7','Active','7-day activity streak','🏃','health','streak_milestone',7,'activity_streak'),
  ('activity_30','Athlete','30-day activity streak','💪','health','streak_milestone',30,'activity_streak'),
  ('goal_first','Goal Setter','Set first savings goal','🎯','goals','count_milestone',1,'goals_set'),
  ('goal_complete','Goal Crusher','Completed a savings goal','🥇','goals','goal_complete',1,NULL),
  ('goal_5','Dream Builder','Completed 5 goals','🌈','goals','count_milestone',5,'goals_completed')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS kid_achievements (
  id SERIAL PRIMARY KEY, kid_name TEXT NOT NULL, achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(), seen_by_kid BOOLEAN DEFAULT FALSE,
  UNIQUE (kid_name, achievement_key)
);
CREATE TABLE IF NOT EXISTS kid_chore_streaks (
  kid_name TEXT PRIMARY KEY, current_streak INTEGER DEFAULT 0, longest_streak INTEGER DEFAULT 0,
  last_completed_date DATE, perfect_days_streak INTEGER DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS kid_activity_streaks (
  kid_name TEXT PRIMARY KEY, current_streak INTEGER DEFAULT 0, longest_streak INTEGER DEFAULT 0,
  last_active_date DATE, updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_achievements_kid ON kid_achievements(kid_name);
