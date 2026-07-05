# FocusFlight — CLAUDE.md

Project intelligence file for Claude Code. Read this before touching any code.

---

## Project Overview

FocusFlight is a gamified study timer where studying feels like taking a flight. You enter your departure airport code, browse a split-flap departure board of **real routes** from that airport (sorted by flight duration — the flight you pick sets your study duration), confirm your boarding pass, then enter "flight mode" — a beautiful dark-themed Mapbox flight tracker with an animated plane, countdown timer, simulated flight stats, ambient sound, and a celebration screen when you land.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite 4 + TypeScript 5 |
| Styling | Tailwind CSS v3 + custom CSS |
| Animations | Framer Motion 10 |
| Map | Mapbox GL JS v3 |
| State | Zustand 4 |
| Airport data | Local JSON (no API key needed) |
| Package manager | npm |

---

## Environment Variables

Create a `.env` file at the project root (never commit it):

```
VITE_MAPBOX_ACCESS_TOKEN=pk.your_token_here
VITE_POSTHOG_KEY=phc_your_key_here          # optional — analytics off without it
# VITE_POSTHOG_HOST=https://eu.i.posthog.com  # only for EU-cloud PostHog projects
```

A `.env.example` is committed with placeholders. Mapbox tokens start with `pk.`.
Get a free token at mapbox.com (50k map loads/month free tier).

---

## Analytics (PostHog)

`src/lib/analytics.ts` is the **only** file that imports `posthog-js`; everything else calls its `track()`. Policy: anonymous ID in localStorage (no cookies, no banner), autocapture and session recording off, **prod builds only** — dev sessions and keyless builds are silent no-ops. Events fire from `flightStore.ts` actions (plus a `pagehide` listener in `main.tsx`):

| Event | Fired by | Key props |
|---|---|---|
| `$pageview` | posthog init | — |
| `departures_viewed` | `setDeparture` | airport |
| `flight_selected` | `selectFlight` | departure, destination, duration_minutes, airline, is_real_route |
| `flight_started` | `startFlight` | departure, destination, duration_minutes |
| `flight_completed` | `landFlight` | departure, destination, duration_minutes |
| `flight_abandoned` | `reset` from tracker / `pagehide` mid-flight | + elapsed_minutes, via |

`flight_started` is the retention anchor event. Deploy needs the `VITE_POSTHOG_KEY` GitHub Actions secret (see `.github/workflows/deploy.yml`).

---

## File Structure

```
src/
  components/
    landing/
      Hero.tsx                    # Full-screen hero with animated clouds + swooping plane
      InputForm.tsx               # Airport code + duration inputs with validation
    boarding/
      BoardingPassCard.tsx        # Single boarding pass component (physical pass design)
      BoardingPassSelection.tsx   # 3-pass selection screen with flip animations
    tracker/
      MapView.tsx                 # Mapbox GL JS map wrapper (StrictMode-safe)
      FlightPath.tsx              # GeoJSON arc + animated SVG plane marker
      StudyTimer.tsx              # HH:MM:SS countdown + circular SVG progress ring
      FlightStats.tsx             # Altitude, speed, distance remaining (parabolic sim)
      AmbientSound.tsx            # Cabin ambient audio toggle button
    shared/
      LandedScreen.tsx            # Full-screen celebration when timer hits 0
      CloudBackground.tsx         # Reusable animated cloud layer
  data/
    airports.ts                   # ~200 major IATA airports with lat/lon
  utils/
    flightCalculations.ts         # haversine, bearing, findDestinations()
    generateFlightInfo.ts         # Random airline/seat/gate/flight# generator
  hooks/
    useFlightProgress.ts          # rAF loop → progress 0–1 + elapsed/remaining
  store/
    flightStore.ts                # Zustand store (all app state)
  App.tsx                         # Phase controller: landing | boarding | tracker | landed
  main.tsx                        # Entry point
  index.css                       # Global styles + Tailwind
```

---

## Core User Flow

1. **Landing Page** — User enters a 3-letter IATA departure code (e.g. JFK). Animated dark hero with clouds + ambient "now boarding worldwide" board of real flights from major hubs (clickable).
2. **Departures Board** — Split-flap board of every real nonstop route from that airport (OpenFlights data), sorted by flight duration, with duration filter chips. The flight you click sets your study duration.
3. **Boarding Pass Confirm** — Single boarding pass for the chosen flight (real airline + aircraft for that route). Physical pass design with perforated edge, barcode.
4. **Flight Tracker** — Mapbox dark map, animated plane along great-circle arc, countdown, simulated altitude/speed stats, ambient sound toggle.
5. **Landed** — Celebration screen with destination info, study stats, confetti. Reset button returns to start.

---

## Design Tokens

| Name | Value | Use |
|---|---|---|
| navy | `#0a0e1a` | Page background |
| midnight | `#0d1b2a` | Card surfaces |
| gold | `#f0c040` | Primary accent, headings |
| amber | `#e8a020` | Secondary accent, hover |
| muted-white | `#d0d8e8` | Body text |

**Fonts:**
- `Playfair Display` (serif) — destination city names
- `JetBrains Mono` (mono) — IATA codes, times, numbers
- `Inter` (sans) — UI labels

---

## Flight Calculation Logic

- Cruising speed: **885 km/h** (550 mph)
- `maxDistance = durationHours × 885`
- Target range: 70–100% of maxDistance
- Divide compass into 3 sectors of 120°, pick best airport per sector
- `haversineKm()` for distance, `bearingDeg()` for compass direction

---

## Boarding Pass Generated Data

**Airlines & aircraft:** real, from OpenFlights route data (`src/data/airlineRoutes.ts`, generated by `npm run data:routes`). Each route pair carries the carriers that actually fly it and their equipment. `FALLBACK_AIRLINES` covers airports with no route data. Route snapshot is June 2014 — codeshares are kept under the marketing carrier; defunct airlines are pruned and rebrands renamed in the build script.

**Seat classes:** Economy, Premium Economy, Business (random, like seat/gate/passenger)

---

## Map / Tracker Notes

- Mapbox style: `mapbox://styles/mapbox/dark-v11`
- **StrictMode guard**: use `useRef` initialized flag — `if (mapRef.current) return;`
- Arc: 100 interpolated great-circle points (manual spherical interpolation — NOT a straight line)
- Plane rotation: CSS `transform: rotate(Xdeg)` computed from bearing between consecutive arc points
- Camera: `map.easeTo({ center, zoom })` to smoothly follow the plane
- Two GeoJSON layers: full arc (dashed/dim) + traveled portion (solid gold)

---

## Simulated Flight Stats (parabolic curve)

```
altitude_ft = 35000 × sin(π × progress)
speed_mph   = 575 × sin(π × progress)
distRemaining = totalKm × (1 − progress)
```

**Flight status phases:**
| Progress | Status |
|---|---|
| 0–3% | Boarding |
| 3–8% | Taxiing |
| 8–20% | Ascending |
| 20–80% | Cruising |
| 80–95% | Descending |
| 95–100% | Landed! |

---

## Key Gotchas

- Use `VITE_MAPBOX_ACCESS_TOKEN` not `MAPBOX_ACCESS_TOKEN` — Vite only exposes `VITE_` prefixed vars
- Timer accuracy: use `Date.now()` deltas in rAF loop, NOT `setInterval` counters (they drift)
- Mapbox double-init in React StrictMode: guard with `useRef` boolean flag
- Airport IATA input: force uppercase, max 3 chars, validate against `airports.ts` on blur
- Great-circle arc: DO NOT use a straight Mercator line (looks wrong at long distances)
- Plane marker rotation: must manually compute bearing and apply as CSS rotate

---

## Non-Goals (v1)

- Real flight data or live APIs (everything is simulated)
- User accounts or persistence
- PWA / offline support
- Actual aviation routing
