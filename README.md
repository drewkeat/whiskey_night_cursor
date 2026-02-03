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
- PostgreSQL

## Setup

1. Clone and install:

   ```bash
   cd whiskey-night
   npm install
   ```

2. Copy env and set `DATABASE_URL` and `NEXTAUTH_SECRET`:

   ```bash
   cp .env.example .env
   ```

   Generate a secret: `openssl rand -base64 32`

3. Run migrations (requires a running Postgres):

   ```bash
   npx prisma migrate deploy
   ```

4. (Optional) Configure email (Resend) and SMS (Twilio) in `.env` for notifications.

5. (Optional) Set `SEARCH_API_KEY` (Brave Search API) for “add whiskey from web search”.

6. Start dev server:

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

- `npm run dev` – development server
- `npm run build` – production build
- `npm run start` – run production server
- `npx prisma migrate dev` – create and apply migrations (dev)
- `npx prisma migrate deploy` – apply migrations (production)
