# NEON ORBIT

A browser arcade game with accounts, server-verified scores, leaderboards, a player dashboard, and an admin console.

## Setup

1. Copy `.env.example` to `.env` and fill in your Supabase project URL and anon key.
2. Install dependencies with `npm install`.
3. Run `npm run dev` for local development, or `npm run build` for a production build.

Without Supabase credentials the game still runs. Scores are saved on the device only, and sign-in, leaderboards, and the dashboard are unavailable.

## Backend notes

- **Database:** Player profiles, game runs, achievements, challenges, and the coin ledger live in Supabase with row level security enabled on every table.
- **Score submission:** The `submit-score` edge function validates each run (whole-number fields, plausibility checks, rate limiting) before recording it. The browser cannot write scores directly.
- **Rewards:** The `claim-reward` edge function grants mission rewards only once per completed challenge.
- **Admin console:** The `admin-api` edge function checks the signed-in user's admin role on the server for every action.

## Deploying edge functions

Deploy `submit-score`, `claim-reward`, and `admin-api` from `supabase/functions/` using the Supabase project's function deployment. Each function's `verify_jwt` setting is defined in `supabase/config.toml`.

## Granting admin access

Set `role` to `admin` on the player's row in the `profiles` table. Admin access is enforced on the server, so the admin page alone grants nothing.
