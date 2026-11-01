/*
# Create NEON ORBIT core schema

Plain-English summary: sets up player profiles, recorded game runs, achievements, daily and weekly challenges, a coin ledger, and the public leaderboard functions for the NEON ORBIT arcade game.

## 1. New tables
- profiles: one row per player. Holds username, avatar choice, role (player or admin), XP, coin wallet balance, and ban flag. Created automatically when someone signs up.
- game_runs: every finished run that passed server validation (score, survival seconds, coins, gems, best combo, XP earned).
- achievements: catalogue of unlockable achievements and their rewards (managed by admins).
- user_achievements: which player unlocked which achievement and when.
- challenges: daily and weekly missions with targets and rewards (managed by admins).
- challenge_claims: records of rewards a player has claimed for a challenge in a given period.
- coin_ledger: audit trail of every coin change (rewards, achievements, admin adjustments).

## 2. Functions
- handle_new_user: trigger on account creation that validates the username and creates the profile.
- is_username_available: lets the sign-up form check a username before registering.
- get_leaderboard: public ranking of best scores for daily, weekly or all-time periods. Returns only public fields and skips banned players.
- get_my_rank: returns the signed-in player's rank for a period.

## 3. Security
- Row level security is enabled on every table.
- Players can read only their own profile, runs, unlocks, claims and ledger rows.
- Players can edit only their username and avatar on their profile. XP, coins, role and ban status can only change through server-side functions.
- Game runs, coin ledger, unlocks and claims are written only by server-side functions using the service role.
- Achievements and challenges are readable by signed-in players only.
- Leaderboard functions are the only public data path and expose no private columns.

## 4. Important notes
1. No destructive statements are used; the migration is safe to re-run.
2. Policies are dropped and recreated so re-running is idempotent.
3. Usernames are 3 to 16 letters, numbers or underscores and are unique regardless of capitalisation.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  avatar_key text NOT NULL DEFAULT 'nova' CHECK (avatar_key IN ('nova','pulse','comet','helix','quasar','drift','ion','vega')),
  role text NOT NULL DEFAULT 'player' CHECK (role IN ('player','admin')),
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  coins integer NOT NULL DEFAULT 0 CHECK (coins >= 0),
  is_banned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_username_format CHECK (username ~ '^[A-Za-z0-9_]{3,16}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx ON profiles (lower(username));

CREATE TABLE IF NOT EXISTS game_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 0),
  duration_seconds integer NOT NULL CHECK (duration_seconds >= 0),
  coins integer NOT NULL DEFAULT 0 CHECK (coins >= 0),
  gems integer NOT NULL DEFAULT 0 CHECK (gems >= 0),
  max_combo integer NOT NULL DEFAULT 0 CHECK (max_combo >= 0),
  xp_earned integer NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS game_runs_user_created_idx ON game_runs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS game_runs_created_idx ON game_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS game_runs_score_idx ON game_runs (score DESC);

CREATE TABLE IF NOT EXISTS achievements (
  key text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'medal',
  metric text NOT NULL CHECK (metric IN ('total_games','best_score','lifetime_coins','best_combo','best_survival')),
  threshold integer NOT NULL CHECK (threshold > 0),
  xp_reward integer NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
  coin_reward integer NOT NULL DEFAULT 0 CHECK (coin_reward >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_key text NOT NULL REFERENCES achievements(key) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_key)
);

CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  metric text NOT NULL CHECK (metric IN ('games','coins','score','survival','combo')),
  period text NOT NULL CHECK (period IN ('daily','weekly')),
  target integer NOT NULL CHECK (target > 0),
  xp_reward integer NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
  coin_reward integer NOT NULL DEFAULT 0 CHECK (coin_reward >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challenge_claims (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, challenge_id, period_start)
);

CREATE TABLE IF NOT EXISTS coin_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coin_ledger_user_created_idx ON coin_ledger (user_id, created_at DESC);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_ledger ENABLE ROW LEVEL SECURITY;

-- Profiles: players read their own row and may change only username and avatar.
GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE (username, avatar_key) ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Game runs: written only by the submit-score server function.
GRANT SELECT ON game_runs TO authenticated;
GRANT ALL ON game_runs TO service_role;

DROP POLICY IF EXISTS "select_own_runs" ON game_runs;
CREATE POLICY "select_own_runs" ON game_runs FOR SELECT
TO authenticated USING (auth.uid() = user_id);

-- Achievements and challenges: catalogue readable by signed-in players, managed by admin functions.
GRANT SELECT ON achievements TO authenticated;
GRANT ALL ON achievements TO service_role;
DROP POLICY IF EXISTS "select_active_achievements" ON achievements;
CREATE POLICY "select_active_achievements" ON achievements FOR SELECT
TO authenticated USING (is_active);

GRANT SELECT ON challenges TO authenticated;
GRANT ALL ON challenges TO service_role;
DROP POLICY IF EXISTS "select_active_challenges" ON challenges;
CREATE POLICY "select_active_challenges" ON challenges FOR SELECT
TO authenticated USING (is_active);

GRANT SELECT ON user_achievements TO authenticated;
GRANT ALL ON user_achievements TO service_role;
DROP POLICY IF EXISTS "select_own_unlocks" ON user_achievements;
CREATE POLICY "select_own_unlocks" ON user_achievements FOR SELECT
TO authenticated USING (auth.uid() = user_id);

GRANT SELECT ON challenge_claims TO authenticated;
GRANT ALL ON challenge_claims TO service_role;
DROP POLICY IF EXISTS "select_own_claims" ON challenge_claims;
CREATE POLICY "select_own_claims" ON challenge_claims FOR SELECT
TO authenticated USING (auth.uid() = user_id);

GRANT SELECT ON coin_ledger TO authenticated;
GRANT ALL ON coin_ledger TO service_role;
DROP POLICY IF EXISTS "select_own_ledger" ON coin_ledger;
CREATE POLICY "select_own_ledger" ON coin_ledger FOR SELECT
TO authenticated USING (auth.uid() = user_id);

-- Profile creation on sign-up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text := NEW.raw_user_meta_data->>'username';
BEGIN
  IF v_username IS NULL OR v_username !~ '^[A-Za-z0-9_]{3,16}$' THEN
    RAISE EXCEPTION 'A valid username is required';
  END IF;
  INSERT INTO public.profiles (id, username) VALUES (NEW.id, v_username);
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.is_username_available(p_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(p_username));
$$;

REVOKE EXECUTE ON FUNCTION public.is_username_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.leaderboard_since(p_period text)
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT CASE p_period
    WHEN 'daily' THEN date_trunc('day', now())
    WHEN 'weekly' THEN date_trunc('week', now())
    ELSE '-infinity'::timestamptz
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.leaderboard_since(text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_period text, p_limit integer DEFAULT 50)
RETURNS TABLE (
  rank bigint,
  user_id uuid,
  username text,
  avatar_key text,
  xp integer,
  best_score integer,
  games_played bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT r.user_id AS uid, max(r.score) AS best, count(*) AS games, min(r.created_at) AS first_at
    FROM public.game_runs r
    JOIN public.profiles pr ON pr.id = r.user_id
    WHERE r.created_at >= public.leaderboard_since(p_period) AND NOT pr.is_banned
    GROUP BY r.user_id
  )
  SELECT
    row_number() OVER (ORDER BY ranked.best DESC, ranked.first_at ASC)::bigint,
    ranked.uid,
    p.username,
    p.avatar_key,
    p.xp,
    ranked.best::integer,
    ranked.games
  FROM ranked
  JOIN public.profiles p ON p.id = ranked.uid
  ORDER BY ranked.best DESC, ranked.first_at ASC
  LIMIT greatest(1, least(coalesce(p_limit, 50), 100));
$$;

REVOKE EXECUTE ON FUNCTION public.get_leaderboard(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_rank(p_period text)
RETURNS TABLE (
  rank bigint,
  best_score integer,
  games_played bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT r.user_id AS uid, max(r.score) AS best, count(*) AS games, min(r.created_at) AS first_at
    FROM public.game_runs r
    JOIN public.profiles pr ON pr.id = r.user_id
    WHERE r.created_at >= public.leaderboard_since(p_period) AND NOT pr.is_banned
    GROUP BY r.user_id
  ),
  numbered AS (
    SELECT ranked.uid, ranked.best, ranked.games,
      row_number() OVER (ORDER BY ranked.best DESC, ranked.first_at ASC) AS position
    FROM ranked
  )
  SELECT numbered.position::bigint, numbered.best::integer, numbered.games
  FROM numbered
  WHERE numbered.uid = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_rank(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_rank(text) TO authenticated;
