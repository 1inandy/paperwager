# PaperWager

Simulated sports betting against real bookmaker lines. Users can create scorecards, place fake-money bets, track bankroll, and compete in private tournaments.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth and Postgres
- The Odds API
- Vercel cron jobs

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Set these in `.env.local` for development and in Vercel for production:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
APP_URL
GUEST_SESSION_SECRET
CRON_SECRET
ODDS_API_KEY
ODDS_PROVIDER
MARKET_BOOKMAKER
ODDS_SYNC_SPORT_KEYS
MODEL_LINES_ENABLED
MODEL_TRAIN_DAYS
ADMIN_USER_IDS
ADMIN_EMAILS
```

Never commit real `.env` files or service-role keys.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Deploy

Deploy on Vercel. The app uses `vercel.json` for scheduled cron routes, and production requires the environment variables above.

Before deploying application changes, apply pending SQL files in
`supabase/migrations/` to the production Supabase project. The security
hardening migration adds the atomic balance operations and shared rate limiter
used by the app.

## Supabase confirmation email

In Supabase Dashboard, open **Authentication → Email Templates → Confirm signup** and paste
[`supabase/email-templates/confirm-signup.html`](supabase/email-templates/confirm-signup.html).
Set the subject to `Verify your PaperWager email`. The template includes both Supabase's
`{{ .ConfirmationURL }}` one-click link and `{{ .Token }}` six-digit verification code.

## License

MIT
