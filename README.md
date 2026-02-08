# Whiskey Night

Plan and schedule Whiskey Night events with your club. Built with Next.js, PostgreSQL, and NextAuth.

## Features

- **Authentication**: Email/password and optional Google OAuth
- **Clubs**: Create clubs, invite members, manage membership
- **Whiskey Nights**: Schedule events with a host, whiskey, and invitees; accept/decline invitations
- **Reviews**: Structured reviews (flavor axes, traits) and open-ended notes for event and personal library
- **Whiskey library**: Global library with search; add whiskeys manually or via web search (Brave Search API)
- **My library**: Personal list of tasted whiskeys with optional reviews
- **Notifications**: Email and SMS for event invites, club updates, and account (Resend + Twilio); optional reminder cron
- **PWA**: Installable on devices; offline fallback page

## Requirements

- Node.js >= 20.9.0
- Docker and Docker Compose (for Postgres), or a local PostgreSQL instance

## Quick start (Docker Postgres)

1. **Install and env:**

   ```bash
   npm install
   cp .env.example .env
   # Set NEXTAUTH_SECRET: e.g. openssl rand -base64 32
   ```

2. **One command to run everything (DB + migrate + seed + app):**

   ```bash
   npm run dev
   ```

   This starts Postgres, runs migrations, seeds test data, and starts the Next.js dev server. Open [http://localhost:3000](http://localhost:3000).

### Test users (after seed)

| Email              | Password   |
|--------------------|------------|
| alice@example.com  | password123 |
| bob@example.com   | password123 |
| carol@example.com | password123 |

Seed creates: one club (“Weekend Whiskey Club”) with all three as members, three whiskeys, one upcoming “Islay Night” event, and two library entries. Use these to log in and test without creating new users each time.

The default `.env.example` `DATABASE_URL` matches Docker Compose (user `whiskey`, password `whiskey`, database `whiskey_night`). Stop the database with `docker compose down`; add `-v` to remove the data volume.

## Deploy with Docker (production)

Run the full stack (Postgres + Next.js app) on a server with Docker Compose.

1. **On the server**, clone the repo and create a `.env` file (or export variables):

   ```bash
   cp .env.example .env
   # Required: set for your domain
   NEXTAUTH_URL=https://your-domain.com
   NEXTAUTH_SECRET=$(openssl rand -base64 32)
   # Optional: Resend, Twilio, Google OAuth, CRON_SECRET
   ```

2. **Build and start:**

   ```bash
   docker compose up -d --build
   ```

   The app will be at `http://localhost:3000` (or map port 3000 to your reverse proxy). The app container runs `prisma migrate deploy` on startup, then starts the Next.js server. Postgres data is stored in a Docker volume.

3. **Optional: seed test data** (only if the DB is empty and you want sample users/clubs):

   ```bash
   docker compose exec app npx prisma db seed
   ```

4. **Logs and stop:**

   ```bash
   docker compose logs -f app
   docker compose down
   ```

   Use a reverse proxy (e.g. Nginx, Caddy) and TLS in front of port 3000; set `NEXTAUTH_URL` to your public URL.

## Deploy to Netlify

Netlify runs Next.js via `@netlify/plugin-nextjs` (serverless/edge). Use a **hosted Postgres** (no Docker on Netlify).

1. **Hosted Postgres**  
   Create a project on [Neon](https://neon.tech) or [Supabase](https://supabase.com) (or another hosted Postgres). Copy the connection string for `DATABASE_URL`.

2. **Netlify site**  
   In Netlify: **Add new site → Import an existing project**, connect your Git provider, and select the repo. Set the production branch (e.g. `main`). Each push to that branch will trigger a build and deploy.

3. **Environment variables**  
   In Netlify: **Site settings → Environment variables**, add the same vars as in `.env.example` (and any others the app reads). At minimum:
   - **Required:** `DATABASE_URL` (hosted Postgres), `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (e.g. `https://your-site.netlify.app`)
   - **Auth:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; for calendar: `GOOGLE_CALENDAR_REDIRECT_URI` (e.g. `https://your-site.netlify.app/api/calendar/callback`)
   - **Optional:** `RESEND_*`, `TWILIO_*`, `OPENAI_API_KEY`, `SEARCH_API_KEY`, `CRON_SECRET`, etc.  
   Do not commit `.env`; keep production secrets only in Netlify.

4. **OAuth redirect URIs**  
   In Google Cloud Console (and any other OAuth providers):
   - Add `https://your-site.netlify.app/api/auth/callback/google` for NextAuth.
   - Add `https://your-site.netlify.app/api/calendar/callback` for Google Calendar (same or same-type OAuth client).

5. **Build**  
   The repo’s `netlify.toml` uses `npm run build:netlify`, which runs `prisma generate`, `prisma migrate deploy`, then `next build`. Migrations run against the build-time `DATABASE_URL`; ensure your hosted DB allows connections from Netlify. Do **not** run `db:seed` in the Netlify build (seed production once manually if needed).

6. **Reminders cron**  
   Netlify does not run a long-lived cron. To send event reminders, either use **Netlify Scheduled Functions** or an **external cron** (e.g. cron-job.org, GitHub Actions) that calls:
   ```http
   GET https://your-site.netlify.app/api/notifications/reminders
   Authorization: Bearer YOUR_CRON_SECRET
   ```

## Setup (without Docker)

1. Clone and install:

   ```bash
   cd whiskey-night
   npm install
   ```

2. Copy env and set `DATABASE_URL` (and optionally `NEXTAUTH_SECRET`):

   ```bash
   cp .env.example .env
   ```

   Generate a secret: `openssl rand -base64 32`

3. Run migrations (requires a running Postgres):

   ```bash
   npx prisma migrate deploy
   ```

4. (Optional) Configure email (Resend) and SMS (Twilio) in `.env` for notifications.

5. Start dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Reminders cron

To send event reminders (24h and 1h before start), call:

```http
GET /api/notifications/reminders
Authorization: Bearer YOUR_CRON_SECRET
```

Set `CRON_SECRET` in `.env` and schedule this in a cron job or serverless function.

## PWA

The app includes a web manifest and service worker. Replace `public/icons/icon-192.png` and `public/icons/icon-512.png` with your own icons for a better install experience.

## Scripts

- `npm run dev` – start Postgres, migrate, seed, then run Next.js dev server (one command for local testing)
- `npm run dev:no-seed` – same as `dev` but skip seeding (use when DB already has data)
- `npm run build` – production build
- `npm run build:netlify` – Prisma generate + migrate deploy + next build (used by Netlify)
- `npm run start` – start Postgres, migrate, then run production server
- `npm run db:up` – start Postgres (Docker)
- `npm run db:down` – stop Postgres (Docker)
- `npm run db:migrate` – apply migrations
- `npm run db:seed` – run seed only (test users + sample data)
- `npm run db:reset` – recreate DB from scratch (migrate reset + seed). Use for a clean slate.
- `npx prisma migrate dev` – create and apply new migrations (dev)
