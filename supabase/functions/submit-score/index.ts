import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LEVEL_BASE_XP = 250;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_RUNS = 4;

type RunInput = {
  score: number;
  durationSeconds: number;
  coins: number;
  gems: number;
  maxCombo: number;
};

type HistoryRow = {
  score: number;
  duration_seconds: number;
  coins: number;
  gems: number;
  max_combo: number;
};

type AchievementRow = {
  key: string;
  title: string;
  description: string;
  icon: string;
  metric: "total_games" | "best_score" | "lifetime_coins" | "best_combo" | "best_survival";
  threshold: number;
  xp_reward: number;
  coin_reward: number;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const levelFromXp = (xp: number) => Math.floor(Math.sqrt(xp / LEVEL_BASE_XP)) + 1;

const RUN_FIELDS = ["score", "durationSeconds", "coins", "gems", "maxCombo"] as const;

function parseRun(raw: unknown): RunInput | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  for (const field of RUN_FIELDS) {
    const value = source[field];
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return null;
  }
  return {
    score: source.score as number,
    durationSeconds: source.durationSeconds as number,
    coins: source.coins as number,
    gems: source.gems as number,
    maxCombo: source.maxCombo as number,
  };
}

// Plausibility limits that mirror the game's scoring rules (max 5x multiplier, 2x boost).
function findRunProblem(run: RunInput): string | null {
  if (run.durationSeconds < 3 || run.durationSeconds > 4 * 3600) {
    return "Run duration is outside the allowed range";
  }
  if (run.coins > Math.ceil(run.durationSeconds * 5) + 20) return "Coin count is not plausible";
  if (run.gems > Math.ceil(run.durationSeconds * 0.5) + 5) return "Gem count is not plausible";
  if (run.maxCombo > run.coins + run.gems) return "Combo is not plausible";
  const maxScore = run.durationSeconds * 100 + run.coins * 50 + run.gems * 250 + 500;
  if (run.score > maxScore) return "Score is not plausible";
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Sign in to save your score" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Sign in to save your score" }, 401);
    const userId = userData.user.id;

    const run = parseRun(await req.json().catch(() => null));
    if (!run) return json({ error: "Run data is incomplete or invalid" }, 400);

    const problem = findRunProblem(run);
    if (problem) return json({ error: problem }, 422);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, xp, coins, is_banned")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return json({ error: "Profile not found" }, 404);
    if (profile.is_banned) return json({ error: "This account is suspended" }, 403);

    const { count: recentRuns, error: recentError } = await admin
      .from("game_runs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString());
    if (recentError) throw recentError;
    if ((recentRuns ?? 0) >= RATE_LIMIT_MAX_RUNS) {
      return json({ error: "Too many submissions. Please wait a moment." }, 429);
    }

    const { data: historyData, error: historyError } = await admin
      .from("game_runs")
      .select("score, duration_seconds, coins, gems, max_combo")
      .eq("user_id", userId);
    if (historyError) throw historyError;
    const history = (historyData ?? []) as HistoryRow[];

    const runXp = Math.floor(run.score / 10) + run.coins + run.gems * 5 + Math.floor(run.durationSeconds / 10);
    const runCoins = run.coins + run.gems * 5;
    const previousBest = history.reduce((best, row) => Math.max(best, row.score), 0);

    const { data: insertedRun, error: insertError } = await admin
      .from("game_runs")
      .insert({
        user_id: userId,
        score: run.score,
        duration_seconds: run.durationSeconds,
        coins: run.coins,
        gems: run.gems,
        max_combo: run.maxCombo,
        xp_earned: runXp,
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    const stats = {
      total_games: history.length + 1,
      best_score: Math.max(run.score, previousBest),
      lifetime_coins: history.reduce((sum, row) => sum + row.coins + row.gems * 5, 0) + runCoins,
      best_combo: Math.max(run.maxCombo, ...history.map((row) => row.max_combo)),
      best_survival: Math.max(run.durationSeconds, ...history.map((row) => row.duration_seconds)),
    };

    const { data: catalogue, error: catalogueError } = await admin
      .from("achievements")
      .select("key, title, description, icon, metric, threshold, xp_reward, coin_reward")
      .eq("is_active", true);
    if (catalogueError) throw catalogueError;

    const { data: unlockedRows, error: unlockedError } = await admin
      .from("user_achievements")
      .select("achievement_key")
      .eq("user_id", userId);
    if (unlockedError) throw unlockedError;
    const unlockedKeys = new Set((unlockedRows ?? []).map((row) => row.achievement_key));

    const newAchievements = ((catalogue ?? []) as AchievementRow[]).filter(
      (item) => !unlockedKeys.has(item.key) && stats[item.metric] >= item.threshold,
    );

    if (newAchievements.length > 0) {
      const { error: unlockError } = await admin.from("user_achievements").insert(
        newAchievements.map((item) => ({ user_id: userId, achievement_key: item.key })),
      );
      if (unlockError) throw unlockError;
    }

    const achievementXp = newAchievements.reduce((sum, item) => sum + item.xp_reward, 0);
    const achievementCoins = newAchievements.reduce((sum, item) => sum + item.coin_reward, 0);
    const newXp = profile.xp + runXp + achievementXp;
    const newCoins = profile.coins + runCoins + achievementCoins;

    const { error: updateError } = await admin
      .from("profiles")
      .update({ xp: newXp, coins: newCoins })
      .eq("id", userId);
    if (updateError) throw updateError;

    const ledgerRows = [
      runCoins > 0 ? { user_id: userId, amount: runCoins, reason: "Run earnings" } : null,
      achievementCoins > 0 ? { user_id: userId, amount: achievementCoins, reason: "Achievement rewards" } : null,
    ].filter((row) => row !== null);
    if (ledgerRows.length > 0) {
      const { error: ledgerError } = await admin.from("coin_ledger").insert(ledgerRows);
      if (ledgerError) throw ledgerError;
    }

    return json({
      runId: insertedRun.id,
      isNewBest: run.score > previousBest,
      xpEarned: runXp + achievementXp,
      coinsEarned: runCoins + achievementCoins,
      levelBefore: levelFromXp(profile.xp),
      levelAfter: levelFromXp(newXp),
      xp: newXp,
      coins: newCoins,
      newAchievements: newAchievements.map((item) => ({
        key: item.key,
        title: item.title,
        description: item.description,
        icon: item.icon,
        xpReward: item.xp_reward,
        coinReward: item.coin_reward,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return json({ error: message }, 500);
  }
});
