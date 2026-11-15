# FocusFlight

A gamified study timer where your study session becomes a flight. Enter your departure airport, pick a real flight from its split-flap departure board — the flight's duration is your study duration — then track your "flight" on a live globe: animated plane, countdown timer, simulated altitude and speed, and a celebration screen when you land.

Your completed flights are saved locally and shown on a rotating globe with glowing arc routes.

---

## Features

- **Real routes** — ~33,000 nonstop routes from OpenFlights: every destination on your board is really served from that airport, by the airline and aircraft that actually fly it
- **Split-flap departure board** — every real flight from your airport, sorted by duration with filter chips; the flight you pick sets your study session length
- **Boarding pass** — confirm your flight on a physical-style pass with real airline, aircraft, seat and gate
- **Live flight tracker** — Mapbox dark map (or satellite) with an animated plane following a great-circle route
- **Simulated flight stats** — altitude, speed, and distance remaining on a parabolic curve
- **Flight history globe** — all your past routes drawn as glowing arcs on a rotating globe
- **Local persistence** — flight log saved to `localStorage`, survives page reloads

## Tech Stack

| | |
|---|---|
| Framework | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS v3 |
| Animations | Framer Motion |
| Map / Globe | Mapbox GL JS v3 |
| State | Zustand (with persist middleware) |
| Airport data | Local JSON — no API calls |

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/Alforest/AirplaneMode-Focus.git
cd AirplaneMode-Focus
```

### 2. Install dependencies

```bash
npm install
```

### 3. Add your Mapbox token

Create a `.env` file in the project root:

```
VITE_MAPBOX_ACCESS_TOKEN=pk.your_token_here
```

Get a free token at [mapbox.com](https://mapbox.com) (50,000 map loads/month on the free tier).

### 4. Run the dev server

```bash
npm run dev
```

### 5. Build for production

```bash
npm run build
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_MAPBOX_ACCESS_TOKEN` | Yes | Mapbox public token (starts with `pk.`) |

> **Note:** Mapbox tokens are inherently client-side and will be visible in the built JS bundle. Restrict your token to specific URLs in the [Mapbox dashboard](https://account.mapbox.com/access-tokens/) to prevent unauthorized use.

## Project Structure

```
src/
  components/
    landing/        # Hero, InputForm, DepartureBoard
    boarding/       # BoardingPassCard, BoardingPassSelection
    tracker/        # MapView, StudyTimer, FlightStats, TrackerPage
    history/        # FlightGlobe, HistoryStats, RecentFlights
    shared/         # LandedScreen, CloudBackground, DevToolbar
  data/
    airports.ts     # ~200 major IATA airports
  store/
    flightStore.ts  # Active flight state (Zustand)
    historyStore.ts # Persisted flight history (Zustand + localStorage)
  utils/
    flightCalculations.ts  # Haversine, bearing, great-circle arc, route finder
    generateFlightInfo.ts  # Random airline/seat/gate generator
  hooks/
    useFlightProgress.ts   # rAF-based flight progress (Date.now() deltas)
  types/
    history.ts      # CompletedFlight interface
```

## License

MIT

## Optional Google login and cloud history

Guest mode works without Supabase configuration. To enable accounts:

1. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in your local `.env`
   and in your hosting provider's **build environment**, then rebuild/redeploy.
   These are public credentials. Never put a Supabase secret/service-role key in a `VITE_` variable.
   For this repository's GitHub Pages deployment, set matching repository **Variables**
   under Settings → Secrets and variables → Actions → Variables. The deployment
   workflow reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` there.
2. Run [`supabase/migrations/202611140001_flight_history.sql`](supabase/migrations/202611140001_flight_history.sql)
   in your project's Supabase SQL Editor. The table uses row-level security: only the
   signed-in owner can read or write their rows. This is private history, not verified
   competitive study time.
3. In Google Cloud Console, configure the OAuth consent screen and create an OAuth
   client of type **Web application**. Add this authorized redirect URI:
   `https://nnkikltsndrnjtnnormx.supabase.co/auth/v1/callback`.
   If the consent screen is in Testing, add your Google account as a test user.
4. In Supabase → Authentication → Sign In / Providers → Google, enable Google and
   enter that Google client ID and client secret. The Google secret stays in Supabase.
5. In Supabase → Authentication → URL Configuration, set Site URL to
   `https://focusflight.io/`. Add allowed redirect URLs:
   - `https://focusflight.io/`
   - `http://localhost:5173/` (use the exact port printed by Vite)
   - `https://www.focusflight.io/` only if you also serve the app there.
6. Test Google login from a normal browser tab. The app returns to the same origin
   and pathname after OAuth using PKCE. No extra callback route is needed.

### Sync behavior

- The Flight Log contains the Google sign-in/account panel; studying requires no login.
- Guest flights stay separate until explicitly imported. Import moves them into the
  current account and deduplicates by flight ID.
- Account caches are separated by Supabase user ID. Signing out restores the guest log.
  Cached account flights remain in browser storage for offline access on future logins.
- Flights are saved locally first. Pending writes survive reloads and retry on network
  reconnection, window focus, every 30 seconds, or **Sync now**.
- Clearing history creates permanent deletion markers, so stale/offline devices cannot
  restore deleted flights. It clears flights already known on that device; sync before
  clearing to include newly completed flights from other devices.
- Flight data is immutable once uploaded. Server deletion markers win over uploads.
- This release does not resume an active timer across devices or validate leaderboard scores.

### Release verification

Run `npm run build` and `npm run test:history`. Then, against configured Supabase:

1. Complete a guest flight; reload and confirm it remains.
2. Sign in with Google, import guest flights, and verify the guest log is empty on sign-out.
3. Sign in on another device and check that flights and totals match.
4. Go offline, complete a flight, reload, reconnect, and confirm exactly one cloud copy.
5. Clear signed-in history, then reconnect a stale device; confirm deleted flights stay gone.
6. Switch between two accounts and confirm their logs never mix. Verify a user's
   access token cannot select or update the other user's rows through the Data API.
7. Cancel Google login and verify guest study sessions still work.

The GitHub connection alone does not apply this SQL or configure OAuth/hosting variables.

## Public policy pages

- Privacy Policy: `https://focusflight.io/privacy/`
- Terms of Service: `https://focusflight.io/terms/`

Use these URLs in Google Auth Platform → Branding after deploying. Vite builds
`privacy/index.html` and `terms/index.html` as standalone pages with shared styling
from `src/legal.css`. GitHub Pages serves them directly, without SPA rewrites or
JavaScript. They also work under the repository's GitHub Pages subpath. The footer
and Google sign-in panel link to both pages. Policy text must be kept consistent
with account, retention, analytics, and advertising behavior when features change.


## Pre-Thanksgiving Crunch challenge

The first opt-in community challenge runs November 14 through November 25, 2026,
ending at **November 26, 00:00 America/New_York** (`2026-11-26T05:00:00Z`).
The homepage includes a seasonal banner, Google sign-in, public nickname enrollment,
top 10 leaderboard, personal rank, and final standings after the deadline.
Equal study totals share a rank. There are no prizes.

### Required database release step

Apply [`supabase/migrations/202611140002_thanksgiving_challenge.sql`](supabase/migrations/202611140002_thanksgiving_challenge.sql)
once in the existing Supabase project's SQL Editor **before publishing the frontend**.
No additional environment variables or secret keys are needed. The existing public
Supabase credentials call restricted database RPCs. Without the migration, the
leaderboard shows an unavailable state and enrollment cannot proceed.

### Eligibility and scoring

- Sign in and explicitly join with a public nickname before takeoff.
- Takeoff registers an independent challenge flight using database time. A flight
  must finish before the deadline, last 1–1,440 whole minutes, and have enough server
  elapsed time before completion is accepted.
- Only one active challenge flight per account is allowed, including across tabs and
  devices. Starting another cancels the previous active challenge flight.
- Completed flights count once. Imported/edited history never contributes.
- Accelerating the development timer invalidates that flight's client completion.
- Be connected at takeoff and landing. Failed completion submissions persist per
  account and retry on reconnection, window focus, and every 30 seconds while the app
  is open. Reconnect before the deadline; late submissions are rejected. A small
  takeoff request delay may mean the first completion request waits for the next retry.
- Active timers do not resume after reload. Pending landed completions do.
- Clearing private history does not clear challenge scores. Account deletion cascades
  to enrollment and challenge flights. Only nicknames, ranks, and totals are public;
  neither account IDs nor emails nor private routes are exposed by the board RPC.
- This checks elapsed time and prevents overlapping credit; it does not prove attention
  or studying and is not intended for prize-bearing competition.

### Challenge validation

The deploy workflow runs `tests/challenge.sql` against disposable PostgreSQL 16 before
publishing. To run locally, use a **disposable** database with a superuser:

```bash
psql -v ON_ERROR_STOP=1 -f tests/challenge.sql
```

The test creates minimal Supabase auth fixtures and rolls everything back. It checks
nickname rules, enrollment timing, private table permissions, server elapsed time,
idempotent completion, replacement of overlapping sessions, account isolation,
shared ranks, deadline enforcement, and anonymous access to final standings.

After applying the migration, verify in a normal browser:

1. Guest: banner links to the leaderboard; empty standings are inviting; Google sign-in
   remains optional for the study timer.
2. Sign in, choose a nickname, and join. Confirm nickname/rank/total appear and email
   does not. A second account cannot claim the same nickname ignoring case.
3. Complete a real-time flight and wait for the next refresh. Its study minutes count
   once. Imported guest flights do not alter the score.
4. Start flights in two tabs. Only the latest active flight can count.
5. Disconnect at landing, reconnect before the deadline, and confirm one completion.
6. Check mobile layout and final standings after the deadline.
