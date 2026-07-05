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
