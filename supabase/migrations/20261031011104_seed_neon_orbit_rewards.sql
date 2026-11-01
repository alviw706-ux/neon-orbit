/*
# Seed NEON ORBIT achievements and challenges

Plain-English summary: adds the starting catalogue of 11 achievements and 6 missions (daily and weekly) with their XP and coin rewards. Admins can edit or switch these off later.

## 1. Changed tables
- achievements: 11 new rows.
- challenges: 6 new rows.

## 2. Security
- No structure or policy changes. Existing row level security rules apply.

## 3. Important notes
1. Uses ON CONFLICT DO NOTHING so the migration is safe to re-run and never overwrites admin edits.
*/

INSERT INTO achievements (key, title, description, icon, metric, threshold, xp_reward, coin_reward) VALUES
  ('first_flight', 'First Flight', 'Complete your first run', 'rocket', 'total_games', 1, 50, 25),
  ('orbit_rookie', 'Orbit Rookie', 'Complete 10 runs', 'orbit', 'total_games', 10, 150, 100),
  ('veteran_pilot', 'Veteran Pilot', 'Complete 50 runs', 'shield', 'total_games', 50, 500, 500),
  ('century_score', 'Century', 'Reach a score of 1,000 in one run', 'star', 'best_score', 1000, 100, 50),
  ('score_hunter', 'Score Hunter', 'Reach a score of 5,000 in one run', 'target', 'best_score', 5000, 400, 250),
  ('neon_legend', 'Neon Legend', 'Reach a score of 20,000 in one run', 'crown', 'best_score', 20000, 1500, 1000),
  ('coin_collector', 'Coin Collector', 'Collect 500 coins in total', 'coins', 'lifetime_coins', 500, 200, 150),
  ('hoarder', 'Hoarder', 'Collect 5,000 coins in total', 'gem', 'lifetime_coins', 5000, 800, 1000),
  ('combo_breaker', 'Combo Breaker', 'Chain 20 pickups in a single run', 'flame', 'best_combo', 20, 200, 100),
  ('survivor', 'Survivor', 'Stay alive for 2 minutes in one run', 'timer', 'best_survival', 120, 300, 200),
  ('endurance', 'Endurance', 'Stay alive for 10 minutes in one run', 'zap', 'best_survival', 600, 1000, 600)
ON CONFLICT (key) DO NOTHING;

INSERT INTO challenges (title, description, metric, period, target, xp_reward, coin_reward)
SELECT * FROM (VALUES
  ('Coin Grab', 'Collect 60 coins and gems today', 'coins', 'daily', 60, 100, 50),
  ('Triple Launch', 'Complete 3 runs today', 'games', 'daily', 3, 80, 40),
  ('Hold The Line', 'Survive 90 seconds in a single run today', 'survival', 'daily', 90, 120, 60),
  ('Weekly Marathon', 'Complete 20 runs this week', 'games', 'weekly', 20, 400, 250),
  ('Apex Score', 'Reach 3,000 points in one run this week', 'score', 'weekly', 3000, 500, 300),
  ('Combo Architect', 'Chain 15 pickups in one run this week', 'combo', 'weekly', 15, 300, 200)
) AS seed(title, description, metric, period, target, xp_reward, coin_reward)
WHERE NOT EXISTS (SELECT 1 FROM challenges c WHERE c.title = seed.title);
