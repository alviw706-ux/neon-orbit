import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USERNAME_PATTERN = /^[A-Za-z0-9_]{0,16}$/;
const KEY_PATTERN = /^[a-z0-9_]{3,40}$/;
const METRICS = ["total_games", "best_score", "lifetime_coins", "best_combo", "best_survival"];
const CHALLENGE_METRICS = ["games", "coins", "score", "survival", "combo"];
const PERIODS = ["daily", "weekly"];
const ICONS = ["medal", "rocket", "orbit", "shield", "star", "target", "crown", "coins", "gem", "flame", "timer", "zap"];

class BadRequest extends Error {}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Body = Record<string, unknown>;

function text(body: Body, field: string, min: number, max: number): string {
  const value = body[field];
  if (typeof value !== "string") throw new BadRequest(`${field} is required`);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new BadRequest(`${field} must be between ${min} and ${max} characters`);
  }
  return trimmed;
}

function int(body: Body, field: string, min: number, max: number): number {
  const value = body[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new BadRequest(`${field} must be a whole number between ${min} and ${max}`);
  }
  return value;
}

function oneOf<T extends string>(body: Body, field: string, allowed: readonly T[]): T {
  const value = body[field];
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new BadRequest(`${field} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

function uuid(body: Body, field: string): string {
  const value = body[field];
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) throw new BadRequest(`${field} is invalid`);
  return value;
}

async function requireAdmin(admin: SupabaseClient, token: string): Promise<string> {
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) throw Object.assign(new Error("Sign in required"), { status: 401 });
  const { data: profile, error } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (error) throw error;
  if (profile?.role !== "admin") throw Object.assign(new Error("Admin access required"), { status: 403 });
  return userData.user.id;
}

type CountQuery = ReturnType<ReturnType<SupabaseClient["from"]>["select"]>;

async function countRows(admin: SupabaseClient, table: string, build?: (q: CountQuery) => CountQuery): Promise<number> {
  let query = admin.from(table).select("id", { count: "exact", head: true });
  if (build) query = build(query);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function usernamesFor(admin: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (ids.length === 0) return names;
  const { data, error } = await admin.from("profiles").select("id, username").in("id", ids);
  if (error) throw error;
  for (const row of data ?? []) names.set(row.id, row.username);
  return names;
}

async function handleStats(admin: SupabaseClient) {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [players, runs, runsToday, activeChallenges, bannedPlayers] = await Promise.all([
    countRows(admin, "profiles"),
    countRows(admin, "game_runs"),
    countRows(admin, "game_runs", (q) => q.gte("created_at", since24h)),
    countRows(admin, "challenges", (q) => q.eq("is_active", true)),
    countRows(admin, "profiles", (q) => q.eq("is_banned", true)),
  ]);
  const { data: top, error: topError } = await admin
    .from("game_runs")
    .select("score")
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (topError) throw topError;
  const { data: wallets, error: walletError } = await admin.from("profiles").select("coins");
  if (walletError) throw walletError;
  const coinsInCirculation = (wallets ?? []).reduce((sum, row) => sum + row.coins, 0);
  return { players, runs, runsToday, activeChallenges, bannedPlayers, highestScore: top?.score ?? 0, coinsInCirculation };
}

async function handleListUsers(admin: SupabaseClient, body: Body) {
  const search = typeof body.search === "string" ? body.search.trim() : "";
  if (!USERNAME_PATTERN.test(search)) throw new BadRequest("Search can only use letters, numbers and underscores");
  let query = admin
    .from("profiles")
    .select("id, username, avatar_key, role, xp, coins, is_banned, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (search) query = query.ilike("username", `%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return { users: data ?? [] };
}

async function handleSetBanned(admin: SupabaseClient, adminId: string, body: Body) {
  const userId = uuid(body, "userId");
  if (typeof body.banned !== "boolean") throw new BadRequest("banned must be true or false");
  if (userId === adminId) throw new BadRequest("You cannot suspend your own account");
  const { error } = await admin.from("profiles").update({ is_banned: body.banned }).eq("id", userId);
  if (error) throw error;
  return { ok: true };
}

async function handleSetRole(admin: SupabaseClient, adminId: string, body: Body) {
  const userId = uuid(body, "userId");
  const role = oneOf(body, "role", ["player", "admin"] as const);
  if (userId === adminId) throw new BadRequest("You cannot change your own role");
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) throw error;
  return { ok: true };
}

async function handleAdjustCoins(admin: SupabaseClient, body: Body) {
  const userId = uuid(body, "userId");
  const amount = int(body, "amount", -10000, 10000);
  const reason = text(body, "reason", 3, 120);
  if (amount === 0) throw new BadRequest("amount must not be zero");
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("coins")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) throw new BadRequest("Player not found");
  const newCoins = profile.coins + amount;
  if (newCoins < 0) throw new BadRequest("This would make the wallet negative");
  const { error: updateError } = await admin.from("profiles").update({ coins: newCoins }).eq("id", userId);
  if (updateError) throw updateError;
  const { error: ledgerError } = await admin
    .from("coin_ledger")
    .insert({ user_id: userId, amount, reason: `Admin: ${reason}` });
  if (ledgerError) throw ledgerError;
  return { coins: newCoins };
}

async function handleListChallenges(admin: SupabaseClient) {
  const { data, error } = await admin
    .from("challenges")
    .select("id, title, description, metric, period, target, xp_reward, coin_reward, is_active")
    .order("period", { ascending: true })
    .order("title", { ascending: true });
  if (error) throw error;
  return { challenges: data ?? [] };
}

function challengePayload(body: Body) {
  return {
    title: text(body, "title", 3, 60),
    description: text(body, "description", 5, 160),
    metric: oneOf(body, "metric", CHALLENGE_METRICS),
    period: oneOf(body, "period", PERIODS),
    target: int(body, "target", 1, 100000),
    xp_reward: int(body, "xpReward", 0, 100000),
    coin_reward: int(body, "coinReward", 0, 100000),
    is_active: typeof body.isActive === "boolean" ? body.isActive : true,
  };
}

async function handleSaveChallenge(admin: SupabaseClient, body: Body) {
  const payload = challengePayload(body);
  if (typeof body.id === "string") {
    const id = uuid(body, "id");
    const { error } = await admin.from("challenges").update(payload).eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await admin.from("challenges").insert(payload);
    if (error) throw error;
  }
  return { ok: true };
}

async function handleListAchievements(admin: SupabaseClient) {
  const { data, error } = await admin
    .from("achievements")
    .select("key, title, description, icon, metric, threshold, xp_reward, coin_reward, is_active")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return { achievements: data ?? [] };
}

async function handleSaveAchievement(admin: SupabaseClient, body: Body) {
  const key = text(body, "key", 3, 40);
  if (!KEY_PATTERN.test(key)) throw new BadRequest("key may only use lowercase letters, numbers and underscores");
  const payload = {
    key,
    title: text(body, "title", 3, 60),
    description: text(body, "description", 5, 160),
    icon: oneOf(body, "icon", ICONS),
    metric: oneOf(body, "metric", METRICS),
    threshold: int(body, "threshold", 1, 10000000),
    xp_reward: int(body, "xpReward", 0, 100000),
    coin_reward: int(body, "coinReward", 0, 100000),
    is_active: typeof body.isActive === "boolean" ? body.isActive : true,
  };
  const { error } = await admin.from("achievements").upsert(payload, { onConflict: "key" });
  if (error) throw error;
  return { ok: true };
}

async function handleActivity(admin: SupabaseClient) {
  const [{ data: runs, error: runsError }, { data: ledger, error: ledgerError }] = await Promise.all([
    admin
      .from("game_runs")
      .select("id, user_id, score, duration_seconds, coins, gems, max_combo, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
    admin
      .from("coin_ledger")
      .select("id, user_id, amount, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);
  if (runsError) throw runsError;
  if (ledgerError) throw ledgerError;
  const ids = [...new Set([...(runs ?? []), ...(ledger ?? [])].map((row) => row.user_id))];
  const names = await usernamesFor(admin, ids);
  return {
    runs: (runs ?? []).map((row) => ({ ...row, username: names.get(row.user_id) ?? "Unknown" })),
    ledger: (ledger ?? []).map((row) => ({ ...row, username: names.get(row.user_id) ?? "Unknown" })),
  };
}

async function handleLeaderboard(admin: SupabaseClient, body: Body) {
  const period = oneOf(body, "period", ["daily", "weekly", "all"] as const);
  const { data, error } = await admin.rpc("get_leaderboard", { p_period: period, p_limit: 100 });
  if (error) throw error;
  return { entries: data ?? [] };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Sign in required" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const adminId = await requireAdmin(admin, token);
    const body = ((await req.json().catch(() => null)) ?? {}) as Body;
    const action = typeof body.action === "string" ? body.action : "";

    switch (action) {
      case "stats":
        return json(await handleStats(admin));
      case "list_users":
        return json(await handleListUsers(admin, body));
      case "set_banned":
        return json(await handleSetBanned(admin, adminId, body));
      case "set_role":
        return json(await handleSetRole(admin, adminId, body));
      case "adjust_coins":
        return json(await handleAdjustCoins(admin, body));
      case "list_challenges":
        return json(await handleListChallenges(admin));
      case "save_challenge":
        return json(await handleSaveChallenge(admin, body));
      case "list_achievements":
        return json(await handleListAchievements(admin));
      case "save_achievement":
        return json(await handleSaveAchievement(admin, body));
      case "activity":
        return json(await handleActivity(admin));
      case "leaderboard":
        return json(await handleLeaderboard(admin, body));
      default:
        return json({ error: "Unknown admin action" }, 400);
    }
  } catch (err) {
    if (err instanceof BadRequest) return json({ error: err.message }, 400);
    const status = typeof (err as { status?: number })?.status === "number" ? (err as { status: number }).status : 500;
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return json({ error: status === 500 ? "Unexpected server error" : message }, status);
  }
});
