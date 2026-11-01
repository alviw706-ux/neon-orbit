import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type ChallengeRow = {
  id: string;
  metric: "games" | "coins" | "score" | "survival" | "combo";
  period: "daily" | "weekly";
  target: number;
  xp_reward: number;
  coin_reward: number;
};

type RunRow = {
  score: number;
  duration_seconds: number;
  coins: number;
  gems: number;
  max_combo: number;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Matches Postgres date_trunc in UTC: days start at midnight, weeks start on Monday.
function periodStartFor(period: "daily" | "weekly", now: Date): Date {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  if (period === "daily") return new Date(Date.UTC(year, month, day));
  const offsetToMonday = (now.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(year, month, day - offsetToMonday));
}

function progressFor(metric: ChallengeRow["metric"], runs: RunRow[]): number {
  switch (metric) {
    case "games":
      return runs.length;
    case "coins":
      return runs.reduce((sum, run) => sum + run.coins + run.gems, 0);
    case "score":
      return runs.reduce((best, run) => Math.max(best, run.score), 0);
    case "survival":
      return runs.reduce((best, run) => Math.max(best, run.duration_seconds), 0);
    case "combo":
      return runs.reduce((best, run) => Math.max(best, run.max_combo), 0);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Sign in to claim rewards" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Sign in to claim rewards" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => null);
    const challengeId = typeof body?.challengeId === "string" ? body.challengeId : "";
    if (!UUID_PATTERN.test(challengeId)) return json({ error: "Choose a valid challenge" }, 400);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, xp, coins, is_banned")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return json({ error: "Profile not found" }, 404);
    if (profile.is_banned) return json({ error: "This account is suspended" }, 403);

    const { data: challenge, error: challengeError } = await admin
      .from("challenges")
      .select("id, metric, period, target, xp_reward, coin_reward")
      .eq("id", challengeId)
      .eq("is_active", true)
      .maybeSingle();
    if (challengeError) throw challengeError;
    if (!challenge) return json({ error: "This challenge is no longer available" }, 404);

    const periodStart = periodStartFor((challenge as ChallengeRow).period, new Date());

    const { data: runData, error: runsError } = await admin
      .from("game_runs")
      .select("score, duration_seconds, coins, gems, max_combo")
      .eq("user_id", userId)
      .gte("created_at", periodStart.toISOString());
    if (runsError) throw runsError;

    const progress = progressFor((challenge as ChallengeRow).metric, (runData ?? []) as RunRow[]);
    if (progress < (challenge as ChallengeRow).target) {
      return json({ error: "This challenge is not complete yet", progress }, 400);
    }

    const { error: claimError } = await admin.from("challenge_claims").insert({
      user_id: userId,
      challenge_id: challengeId,
      period_start: periodStart.toISOString(),
    });
    if (claimError) {
      if (claimError.code === "23505") return json({ error: "You already claimed this reward" }, 409);
      throw claimError;
    }

    const reward = challenge as ChallengeRow;
    const newXp = profile.xp + reward.xp_reward;
    const newCoins = profile.coins + reward.coin_reward;

    const { error: updateError } = await admin
      .from("profiles")
      .update({ xp: newXp, coins: newCoins })
      .eq("id", userId);
    if (updateError) throw updateError;

    if (reward.coin_reward > 0) {
      const { error: ledgerError } = await admin.from("coin_ledger").insert({
        user_id: userId,
        amount: reward.coin_reward,
        reason: "Challenge reward",
      });
      if (ledgerError) throw ledgerError;
    }

    return json({
      challengeId,
      xpEarned: reward.xp_reward,
      coinsEarned: reward.coin_reward,
      xp: newXp,
      coins: newCoins,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return json({ error: message }, 500);
  }
});
