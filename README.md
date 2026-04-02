# AirplaneMode Focus

A gamified study timer where your study session becomes a flight. Enter how long you want to study, pick a destination from a split-flap departure board, then track your "flight" on a live globe — animated plane, countdown timer, simulated altitude and speed, and a celebration screen when you land.

Your completed flights are saved locally and shown on a rotating globe with glowing arc routes.

---

## Features

- **Split-flap departure board** — browse suggested routes by study duration, click any flight to depart
- **Boarding pass selection** — three destination passes generated based on your study time and departure airport
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
