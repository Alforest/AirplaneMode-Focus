import posthog from 'posthog-js';
import { Airport } from '../data/airports';
import { haversineKm } from '../utils/flightCalculations';

// ---------------------------------------------------------------------------
// Analytics — thin PostHog wrapper. This is the ONLY file that imports
// posthog; everything else calls track().
//
// Policy: anonymous only. No cookies (localStorage persistence), no
// autocapture, no session recording, prod builds only. Without a
// VITE_POSTHOG_KEY the whole module is a silent no-op, so local dev and
// forks never send events.
// ---------------------------------------------------------------------------

let enabled = false;

export function initAnalytics(): void {
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  if (!import.meta.env.PROD || !key) return;

  posthog.init(key, {
    api_host: (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com',
    persistence: 'localStorage',
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: false,
    disable_session_recording: true,
  });
  enabled = true;
}

export function track(
  event: string,
  props?: Record<string, unknown>,
  opts?: { instant?: boolean }
): void {
  if (!enabled) {
    // Dev builds send nothing, but log the would-be event so payloads are
    // verifiable in the console
    if (import.meta.env.DEV) console.debug('[analytics]', event, props);
    return;
  }
  // instant: bypass the batch queue (~3s flush) — required for events fired
  // during pagehide, where the queued batch would die with the page
  posthog.capture(event, props, opts?.instant ? { transport: 'sendBeacon', send_instantly: true } : undefined);
}

// ---------------------------------------------------------------------------
// routeProps — shared property bag for every flight event, so PostHog can
// break down popularity by a single property: `route` for route rankings,
// `distance_km`/`haul` for route length, `duration_bucket` matching the UI
// filter chips, plus cities/countries for geographic insights.
// ---------------------------------------------------------------------------

export function routeProps(
  departure: Airport | null,
  destination: Airport | null,
  durationMinutes: number
): Record<string, unknown> {
  const distanceKm =
    departure && destination
      ? Math.round(haversineKm(departure.lat, departure.lon, destination.lat, destination.lon))
      : undefined;

  return {
    departure: departure?.iata,
    destination: destination?.iata,
    route: departure && destination ? `${departure.iata}-${destination.iata}` : undefined,
    departure_city: departure?.city,
    departure_country: departure?.country,
    destination_city: destination?.city,
    destination_country: destination?.country,
    duration_minutes: durationMinutes,
    duration_bucket:
      durationMinutes < 60 ? '<1h'
      : durationMinutes < 120 ? '1-2h'
      : durationMinutes < 240 ? '2-4h'
      : '4h+',
    distance_km: distanceKm,
    haul:
      distanceKm === undefined ? undefined
      : distanceKm < 1500 ? 'short'
      : distanceKm < 4000 ? 'medium'
      : 'long',
  };
}
