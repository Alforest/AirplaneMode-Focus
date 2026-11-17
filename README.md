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
- Active-flight recovery is local to the same browser and account; it does not resume across devices. Challenge scoring uses its separate server timer.

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


### Nickname moderation

Apply `supabase/migrations/202611150001_nickname_moderation.sql` to enable the
server-side nickname rule. It rejects common English profanity/slurs, folds case
and common number substitutions, and detects separated variants of strong terms.
Ambiguous words use token matching to reduce innocent-name false positives.
Existing matching nicknames receive random `Traveler-…` aliases without changing
membership or scores. New and updated names must satisfy a database constraint,
including writes that bypass the UI. Signup displays a specific moderation error.
The SQL integration tests cover bypass attempts and innocent-name regressions.
This is a curated English filter, not comprehensive multilingual moderation;
new spellings may need additions to the validator in a later migration.


## Traveler passport and profiles

Account/Sign in now opens a native modal dialog instead of scrolling to the flight
log. The dialog contains Google sign-in, sync/import controls, profile editing,
and private stats (all-time and current-week study time, flights, streak, longest
session, and unique destinations). Escape, close, outside click, keyboard focus
containment, focus restoration, and page scroll locking use the native dialog.
After Google sign-in the app reopens the passport when session storage is available.

Apply `supabase/migrations/202611150002_traveler_profiles.sql` after the nickname
moderation migration and before deploying this frontend. It creates private profiles,
a server-side airport-code registry from the local airport dataset, and a validated
save RPC. Existing challenge nicknames become profile nicknames. Nicknames are unique
ignoring case, use the existing profanity validator, and update challenge names in
the same transaction without changing enrollment times or scores. Saving a profile
does not enroll the account in a challenge. Old clients' join requests also use the
saved profile identity. Home airports remain private and must exist in the registry.

Profiles load on sign-in and refresh on focus, reconnection, and the existing 30-second
retry timer. Late responses cannot overwrite another account's profile or a newer
save. Profiles are not separately persisted to browser storage; failed saves show an
error and retain the form for retry. Signing out clears the profile UI. A saved home
airport pre-fills the departure box without replacing something the user has already
typed. A visible home-airport shortcut lets them return to their default. Greetings
and account access appear on both the homepage and the departures board.

`npm run test:stats` covers week boundaries, streaks, repeated flights, year boundaries,
and totals. `tests/challenge.sql` also checks private profile reads, validated writes,
moderation, real airport validation, optional home-airport clearing, challenge identity
consistency, score preservation, and account-deletion cascading.

Browser release checks: open/close passport by mouse, Escape and keyboard; sign in
and verify passport returns; edit/save nickname and home airport; reload and sign in
on another device; verify the departure default and challenge name; switch accounts
and verify no identity or stats mix; check the dialog at phone width.


## Weekly goals and landing rewards

The traveler passport has a weekly study target (2h, 5h, 10h presets or half-hour
increments from 0.5h to 168h). Targets repeat each week; progress uses completed
flight history from Monday 00:00 in local time, including imported flights.
The homepage and landing screen show progress, remaining time, and a completed state.
No target is chosen automatically. Removing a target preserves flight history.

Signed-in targets sync privately through `weekly_study_goals` in Supabase. Guest
targets stay on the device and are never automatically imported. The v2 local cache
preserves pending account edits for offline retry. A legacy v1 account target migrates
only if no server record exists; a cloud value or removal marker takes precedence.
A preview flight still affects real history if signed in; use guest mode for testing.

Landing cards recognize a weekly target crossed by this flight, first flight, new
country, a strictly longer personal best, and an extended study streak. Up to three
milestones appear; a normal session still gets a positive acknowledgment. The just-
saved flight is excluded from historical comparisons so rendering it again cannot
double count its time. These are private motivational summaries, not leaderboard
scores or persistent collectible badges.

Run `npm run test:goals` for persistence/account isolation, target validation, week
boundaries, deduplicated landing comparisons, and milestone rules. To preview a
landing quickly on localhost, use guest mode and the existing development toolbar's
Force Land action; test sessions are saved to that guest history.


## Passport / weekly-goal analytics

All custom events carry `experience_version: passport_goals_v1`. Production uses
an anonymous browser identifier for guests and a stable `account:<Supabase user UUID>`
identifier after sign-in; development logs would-be events only.
Goal-editor and landing-reward exposure events use viewport visibility, not just component mounting.
PostHog identify connects signed-in activity across sessions/devices and can merge
prior anonymous browser activity. No emails, nicknames, home-airport codes, Google
names/pictures, or feedback free text are sent. The internal account ID is sent as
the analytics identity, not as a separate event property. Goals sync for accounts. Feedback is optional and submitted once per account/guest
on this browser for this experience version; only positive/negative is sent.

| Event | Properties / meaning |
| --- | --- |
| `account_opened` | `source`, `signed_in`, `has_profile`, `has_weekly_goal`; once per closed→open transition |
| `account_closed` | Same context plus `reason`, `duration_seconds`; explicit dialog closes only |
| `sign_in_requested` / `sign_in_completed` / `sign_in_failed` | Google redirect request, successful return, or locally reported error; request uses immediate beacon |
| `personal_stats_viewed` | `signed_in`, `surface=passport`; signed-in stats rendered in open dialog |
| `profile_save_started` / `profile_saved` / `profile_save_failed` | `is_new_profile`; success adds `nickname_changed`, `home_airport_changed`, `has_home_airport`; failure adds error code only |
| `weekly_goal_editor_viewed` | `signed_in`, `has_weekly_goal` |
| `weekly_goal_saved` | `goal_minutes`, `previous_goal_minutes`, `is_new_goal`, `signed_in`; only after successful local save |
| `weekly_goal_removed` | `previous_goal_minutes`, `signed_in` |
| `weekly_goal_save_failed` | `signed_in`, optional removal action |
| `landing_rewards_viewed` | `reward_types` (fixed milestone IDs), `reward_count`, `has_weekly_goal`, `signed_in`; no reward text |
| `weekly_goal_achieved` | `goal_minutes`, `signed_in`; a completed flight crosses its weekly target |
| `account_feedback_submitted` | `rating=positive/negative`, `surface=passport`, `signed_in` |

`flight_started`, `flight_completed`, and `flight_abandoned` also include `signed_in`,
`has_weekly_goal`, and `goal_minutes` for engagement comparisons. Existing route data
on flight events is unchanged. `account_opened.source` is one of `homepage_header`,
`departures_header`, `flight_log`, `welcome`, `goal_prompt`, `challenge_profile`,
`oauth_return`, or `unknown`. Exclude `oauth_return` when measuring manual discovery.

Suggested dashboard: daily unique browser visitors and account openers; opener share
of visitors; opening sources; account→profile-save and goal-editor→goal-save funnels;
sign-in funnel; home-airport adoption; saved goal distribution; goal achievements;
positive/negative feedback with response count; and D1/D7 completed-flight retention
for goal savers versus other study users. Show save failures as a quality metric.
Use the experience-version filter for custom events, but not the automatic `$pageview`
denominator for historical data (older automatic pageviews lacked the property).
New pageviews wait for auth resolution and also carry the experience property.
Repeat use and time in a dialog are engagement signals, not satisfaction or causal
proof. Feedback is a voluntary sample. Guest browser IDs do not deduplicate across devices. New signed-in identity tracking
deduplicates accounts across devices; filter `identity_version=account_v1` to inspect
the rollout. Historical anonymous data is not guaranteed to be fully backfilled.


### Cloud-goal and identified-analytics release

Apply `supabase/migrations/202611160001_cloud_weekly_goals.sql` before publishing.
The goal table uses own-account RLS and a validated compare-and-swap save RPC; direct
client writes are denied. The RPC also checks its explicit owner against auth.uid()
to reject writes whose browser account switched while waiting for credentials.
Goal removals retain null-valued server rows. Account deletion cascades to goals.

Reads/retries run on sign-in, focus, reconnection, and every 30 seconds. Saves stay
local until synced and have visible status. Revision conflicts adopt the cloud value
and ask the user to review/save again, rather than overwriting a newer device edit.
A local edit made during its own successful upload is rebased onto that response.

Analytics starts with automatic pageviews disabled. After auth resolves, the identity
controller resets stale/different account identities, identifies the current account,
and sends the initial pageview plus any buffered events. Repeated auth/token events
do not repeat identify/pageviews. Logout resets to a new anonymous browser identity.
The existing experience filter `passport_goals_v1` remains valid; `identity_version`
is `account_v1` for the new pipeline. Session recording and autocapture remain off.

Run `npm run test:analytics`, `npm run test:goals`, and the existing test suites.
SQL tests cover RLS, invalid goals, owner mismatch, stale revisions, removal markers,
and account deletion. Browser release checks: signed-in activity on two devices
should share a PostHog person; logout/account switching must keep people separate;
goals should appear on the other device; stale offline edits should show a conflict.


## Map controls, safe exits, and flight recovery

The tracker has labeled Full route / Follow plane controls and direct +/− zoom.
Full route frames the great-circle arc, including unwrapped antimeridian crossings.
Follow updates center only, preserving zoom even on the ground. Dragging, pinching,
scrolling, or rotating switches to free exploration. Follow plane recenters and resumes
tracking. The map loop starts on load without delayed timers; cleanup cancels the loop,
removes markers/map, and disconnects the resize observer, including StrictMode remounts.

Back (including browser Back while tracking) opens an exit dialog: Keep studying,
Save & return to terminal, or End flight without logging. Saving doesn't pause time.
Refresh/close stores a device-local snapshot and emits `flight_interrupted`, not an
abandonment. The next visit shows a resume/arrival card after auth resolves. Account
snapshots are offered only to their original account; guest snapshots remain separate.
A different account cannot inherit an active timer. This does not sync across devices.

Snapshots contain route, boarding information, original/rebased timer, speed, session
ID, completion time, and confirmed challenge registration. `focusflight-active-flight-v1:`
keys are scoped per owner. No new Supabase migration is required. Recovery uses wall
clock elapsed time, not a paused countdown. Arrival after an offline finish logs the
scheduled completion date, not the return date, and cannot claim a later week's goal.
Completion remains deduplicated by the same session UUID. Challenge recovery never
creates a new server start: only a previously confirmed registration is eligible;
existing server deadline/elapsed/overlap checks still apply at landing.

Explicit end/discard clears its recovery record. Starting a different flight warns
that it replaces the saved one. A stale tab cannot erase or overwrite a newer recovery
record. If browser storage is unavailable, the tracker says recovery is unavailable
and Save & return is disabled. Clear browser data to remove cached recovery state.

Run `npm run test:recovery` plus existing suites. Browser QA: check zoom before and
after takeoff, free pan, Follow, Full route, style switching, mobile touch controls;
use Back/cancel/save/end; reload midway; reopen after the scheduled finish; switch
accounts; verify duplicate reloads don't duplicate the history or challenge score.
Use guest mode for development/Force Land checks because signed-in test flights sync.


### Search visibility and study guides

The landing page title, canonical URL, social previews, and JSON-LD live in
`index.html`. `npm run build` also renders the existing `HowItWorks` component into
`dist/index.html`, making the explanation, FAQ, and footer links available without
JavaScript. The flight app stays client-rendered. A separate hydrated content root
shows this section only during the landing phase and hides it on the contact screen.
The build deliberately does not render account data or saved flights.

Two standalone, mobile-friendly guides are built as static HTML using the existing
legal-page stylesheet:

- `/study-with-airplane-mode/` — preparing devices and materials for a study session.
- `/plan-a-focus-session/` — choosing a task, time window, and suitable flight.

They are linked from the homepage footer and from each other, have their own
metadata, and are included in `public/sitemap.xml`. They load no app, analytics,
advertising, or map JavaScript. Add any future public guide to Vite's HTML inputs
and the sitemap. Keep FAQ JSON-LD aligned with the visible FAQ.

After deployment, verify `https://focusflight.io/` in Google Search Console,
submit `https://focusflight.io/sitemap.xml`, and inspect the homepage and both
guides. Check the rendered HTML and indexing status, then monitor queries,
impressions, and clicks before making further keyword changes. Run PageSpeed
Insights on the public homepage and use its measured results to prioritize
performance work. Search Console verification requires the site owner's account;
no verification token is included in this repository.
