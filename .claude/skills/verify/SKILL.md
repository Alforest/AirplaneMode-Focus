---
name: verify
description: Build, launch, and drive FocusFlight to verify a change end-to-end in the real app (dev server + Playwright).
---

# Verifying FocusFlight changes

## Launch

```bash
npm run dev          # Vite on http://localhost:5173, needs .env with VITE_MAPBOX_ACCESS_TOKEN (already present)
```

Run it in the background; it's up when `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/` returns 200 (~2s).

## Drive with Playwright

Playwright is NOT in this repo's node_modules. A working copy lives in the npx cache
(`~/.npm/_npx/*/node_modules/playwright` — find it with
`for d in ~/.npm/_npx/*/node_modules/playwright/package.json; do echo $d; done`), and matching
Chromium builds are cached in `~/Library/Caches/ms-playwright/`. Symlink it into your script dir:

```bash
mkdir -p node_modules
ln -sf ~/.npm/_npx/<hash>/node_modules/playwright node_modules/playwright
ln -sf ~/.npm/_npx/<hash>/node_modules/playwright-core node_modules/playwright-core
```

`NODE_PATH` does NOT work — the script uses ESM imports.

## Reaching each phase (steal selectors from marketing-videos/rec.mjs)

1. **Check-in**: `page.locator('input[aria-label="Departure airport IATA code"]')` → click → `keyboard.type('JFK')` → wait ~1.2s → click `getByRole('button', { name: /depart/i })`.
2. **Departures board**: rows are `[role="button"]:has-text("LONDON")`; scroll with `page.mouse.wheel(0, 150)` until the row is mid-viewport, then click. Landing on the boarding pass shows text "Your Boarding Pass".
3. **Board**: hover then click `text=Board This Flight` (the click needs the hover-revealed pill, wait ~500ms after hover).
4. **Tracker**: remaining time is the only `\d{2}:\d{2}:\d{2}` in `document.body.textContent`.
   Zoom slider steps are `button[title="Route"|"World"|"Region"|"Country"|"City"|"Close"]`;
   "Route" = fixed full-path camera. Airport markers are `.mapboxgl-marker` elements whose
   textContent is the IATA code; the plane marker is the one with empty text — screen-position
   them via getBoundingClientRect to assert camera/plane behavior.

## Dev toolbar (dev builds only, `import.meta.env.DEV`)

- Bottom-right panel: speed buttons `1× 10× 60× 300×` + `Force Land`. Click via
  `[...document.querySelectorAll('button')].find(b => b.textContent.trim() === '60×').click()`.
- Speed changes rebase `startTime` in the store — continuous, safe to change mid-flight either direction.
- Backtick (`` ` ``) toggles ALL dev chrome (toolbar, DEV pill, dev ad placeholder) for clean recordings;
  guarded when an input/textarea is focused. State lives in `flightStore.devChromeHidden`.

## Flight log (landing page, below the fold)

Seed history before load — `localStorage['airplane-mode-history'] = JSON.stringify({ state: { flights: [CompletedFlight, …] }, version: 0 })`
(shape in `src/types/history.ts`) via `page.addInitScript`. The globe is the first `.mapboxgl-canvas`;
drag with mouse.down/move/up to rotate it (auto-rotation pauses while dragging).

## Gotchas

- Vite dev serves instantly but doesn't typecheck — run `npx tsc --noEmit` separately.
- The dev AdSense placeholder ("AD 250×250") renders in dev sidebars; it's dev chrome, not a bug.
- rec.mjs in marketing-videos/ has battle-tested helpers (glideClick, checkIn, pickFlight, setSpeed) worth copying.
