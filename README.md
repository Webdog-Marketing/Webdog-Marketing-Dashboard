# Webdog Ledger

A private dashboard for Webdog Marketing: clients, income by type, team
capacity (hours needed vs. hours available), monthly expenditure, and a
live read-out of open Trello tasks.

Built with Next.js 14 (App Router) + Prisma + Postgres, styled to look like
a working ledger rather than a generic SaaS template.

## What it tracks

- **Clients** — name, status (active/paused/ended), hours needed per month
- **Income** — logged per entry, tagged as SEO retainer / one-off project /
  website / ads / other, optionally linked to a client
- **Capacity** — total hours your active clients need vs. hours your team
  (currently you + Jatin) has available
- **Expenditure** — logged per entry with a category, rolled up by category
  and by month
- **Tasks** — read-only pull from one or more Trello boards, grouped by list,
  with a "due this week" summary on the overview page

## 1. Local setup

```bash
npm install
cp .env.example .env.local
# fill in .env.local — see "Database" and "Trello" below
npx prisma db push   # creates the tables in your database
npm run db:seed      # optional: adds you + Jatin as staff, one example client
npm run dev
```

Open http://localhost:3000 — if you set `APP_PASSWORD` you'll be asked for it.

## 2. Database (Postgres)

Any Postgres works. The two easiest options that pair well with Vercel:

- **Vercel Postgres** (Storage tab in your Vercel project) — it gives you
  `DATABASE_URL` and a pooled connection automatically; set
  `DATABASE_URL_UNPOOLED` to the same value if it doesn't provide a separate
  one.
- **Neon** (neon.tech, generous free tier) — copy the pooled connection
  string into `DATABASE_URL` and the direct one into `DATABASE_URL_UNPOOLED`.

After setting the variables, tables are created automatically — the build
command now runs `prisma db push` itself, so nothing extra is needed on
Vercel. (If you're running this locally too, `npx prisma db push` does the
same thing against whatever `DATABASE_URL` is in your `.env.local`.)

## 3. Trello

1. Go to https://trello.com/power-ups/admin, create a Power-Up (any name),
   and grab an **API key** from it.
2. From that same page, follow the link to generate a **token** authorised
   against your account (read-only is enough).
3. Open each board you want pulled in and copy its ID from the URL:
   `trello.com/b/XXXXXXXX/board-name` — `XXXXXXXX` is the ID.
4. Set `TRELLO_API_KEY`, `TRELLO_TOKEN`, and `TRELLO_BOARD_IDS` (comma
   separated for more than one board).

Until these are set, the Tasks page just tells you it isn't connected —
everything else works fine without it.

## 4. Google Calendar

This maps your real meeting load against client hours, so "capacity used"
reflects an actual month rather than a fixed guess.

1. In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create a project (or use an existing one) and enable the **Google Calendar API**
   under "APIs & Services → Library".
2. Under "APIs & Services → Credentials", create an **OAuth 2.0 Client ID** of
   type "Web application".
3. Add `https://<your-deployed-domain>/api/google/callback` as an authorised
   redirect URI (and `http://localhost:3000/api/google/callback` too if you
   want to test locally).
4. If your OAuth consent screen is in "Testing" mode, add your own Google
   account as a test user — otherwise Google will refuse the login.
5. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from the credential you
   just created.
6. Deploy, then go to **Clients & capacity** and click **Connect Google
   Calendar**.

Once connected, tick "use calendar" next to a team member on that page —
their available hours become `working hours this month − meeting time`
instead of the fixed number, and that feeds into the capacity bar and the
"Capacity used" figure on the overview. Working hours default to Mon–Fri,
9am–5pm Europe/London; override with `WORK_TIMEZONE`, `WORK_HOURS_START`,
`WORK_HOURS_END` if that's not right for you.

Only one Google account can be connected at a time (this is a single-user
tool) — so this suits linking your own calendar, with Jatin's hours left as
a manual figure.

## 5. Deploy to Vercel

1. Push this folder to a new GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<you>/webdog-ledger.git
   git push -u origin main
   ```
2. In Vercel: **New Project → Import** your repo.
3. Add the environment variables from `.env.example` (Database, `APP_PASSWORD`,
   Trello) under **Settings → Environment Variables**.
4. Deploy. Then run `npx prisma db push` once locally with `DATABASE_URL`
   pointed at the production database, so the tables exist.

## Notes on the numbers

- "Capacity used" on the overview splits the hours your clients need evenly
  across your team members as a rough gut-check — it isn't per-client
  assignment. If you want it more precise later, that's a small addition
  (an `assignedStaffId` on `Client`).
- Income and expenses are logged as individual dated entries rather than
  fixed monthly amounts, so irregular months (a one-off project landing
  alongside your retainers) show up accurately. Recurring items are
  logged again each month it happens — a "recurring" tick just marks it
  for your own reference for now.
- Calendar-derived hours use your calendar's `primary` free/busy data for
  the current month only (not future/past months), and treat every
  Mon–Fri as a working day — bank holidays and days off aren't excluded
  automatically, so the number will run a little high around those.
- Tokens for the connected Google account are stored in your database,
  not encrypted — fine for a single-user internal tool, but worth knowing
  if you ever share database access with anyone else.

## What's new since the first version

- **Client rate, start date, links, billable flag** — each client now has a
  £/hr rate, a start date (for tenure/churn stats), an optional Trello card
  ID (not board ID — see below), and six optional link fields (Website,
  Google Drive folder, Data Studio, Search Console, Google Ads, Analytics),
  all shown on that client's own page at `/clients/<id>`.
- **Pro-bono / volunteer clients** — untick "billable" on a client (e.g. a
  federation you support for free) and it's excluded from capacity and
  blended-rate maths, but still trackable — set a notional rate so the time
  still shows a £ value.
- **Time tracking** (`/time`) — log hours against any client; each entry is
  valued at that client's rate automatically, split into billable vs.
  pro-bono totals.
- **Tech stack** (`/tech-stack`) — track domains, hosting/CMS, and software
  subscriptions with cost, billing cycle and renewal date. A "renews in
  N days" flag appears on the Overview for anything due in the next 30
  days. On the 1st of each month, a scheduled job posts each tool's cost to
  Expenditure automatically — annual tools are split evenly across 12
  months so spend stays smooth rather than spiking on the renewal date.
  This needs **Vercel Cron** set up (see below) — everything else in the
  app works without it.
- **Client health** — churn rate (ended ÷ everyone ever signed), average
  tenure of active clients, and average lifespan of clients who left, shown
  on both the Overview and Clients & capacity pages.
- **Trello reworked for checklists** — the original version assumed one
  card per task. If your board instead has one *card per client* with a
  *checklist* of tasks inside it (checkboxes), that's what this now
  expects: `TRELLO_BOARD_IDS` still pulls every list/card for the Tasks
  page, but each client also gets its own `trelloCardId` (paste it from
  that card's "Share" menu → "Copy link", the ID is the part after
  `trello.com/c/`) so its detail page shows that card's live checklist
  progress directly.

### Setting up the monthly tech-stack job (Vercel Cron)

This repo includes a `vercel.json` that tells Vercel to call
`/api/cron/tech-expenses` at 6am UTC on the 1st of each month. To make it
actually run:

1. Set `CRON_SECRET` to any random string in your environment variables —
   Vercel sends this automatically as a bearer token, and the route checks
   it, so nobody else can trigger it.
2. Deploy — Vercel picks up `vercel.json` automatically, no separate
   dashboard step needed.
3. Cron Jobs are available on Vercel's Hobby (free) plan for a single
   monthly job like this one, so no paid plan is required.

If you'd rather not wait for the 1st of the month to see it work, you can
trigger it manually once by visiting
`https://<your-domain>/api/cron/tech-expenses` with an `Authorization:
Bearer <your CRON_SECRET>` header (a tool like Postman, or `curl -H
"Authorization: Bearer <secret>" https://.../api/cron/tech-expenses`).
