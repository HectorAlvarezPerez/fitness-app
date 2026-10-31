# Fitness App

Mobile-first workout tracker built with React, TypeScript, Zustand, and Supabase. The app focuses on fast session logging, compact progress analytics, and a cleaner phone-oriented training flow.

This is an open source, self-hosted project. There is no public instance: to use it, run your own Supabase and serve the build yourself.

## Screenshots

### Landing

![Fitness App landing screen](./docs/screenshots/landing.png)

### Home

![Fitness App home screen](./docs/screenshots/home.png)

## What It Does

- Email auth with Supabase plus a guest flow for quick previews.
- Guided onboarding for profile basics, training goal, and context.
- Routine list and routine editor for saved training plans.
- Live workout sessions with active-workout resume support.
- Rest timer, workout timer, and plate calculator helpers.
- Exercise library and custom exercise editing.
- Dashboard with summary stats, workout calendar, volume chart, and muscle distribution.
- Workout history, PR tracking, and progress pages.
- Optional Web Push alerts when a rest timer ends (see `deploy/push`).

## Stack

- React 19
- Vite 6
- TypeScript
- Zustand
- Supabase
- Recharts
- React Router
- Cloudflare deployment via Wrangler

## Local Setup

### Prerequisites

- Node.js 20+
- npm
- Supabase project credentials

### Install

```bash
git clone git@github.com:HectorAlvarezPerez/fitness-app.git
cd fitness-app
npm install
```

### Environment

Create `.env` or `.env.local` in the project root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run

```bash
npm run dev
```

### Quality Checks

```bash
npm run test
npm run lint
npm run build
```

## Deployment

The app is a static Vite build that talks to a Supabase backend. Pick one:

- **Self-hosted (Docker + nginx):** `deploy/local` builds the app into an nginx container that also proxies the Supabase API. Copy `deploy/local/.env.example` to `deploy/local/.env`, fill it in and run `docker compose up -d --build` from that folder. `deploy/local/backup-postgres.sh` dumps the database.
- **Web Push (optional):** `deploy/push` is a small Node service that schedules rest-timer notifications. It needs VAPID keys and the Supabase URL/anon key as environment variables (see `server.js`); `fitness-push.service` is an example systemd unit.
- **Cloudflare Workers:** `npm run deploy` builds the app and publishes it with Wrangler (`wrangler.toml`).

## License

MIT, see [LICENSE](LICENSE).
