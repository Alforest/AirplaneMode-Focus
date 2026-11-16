import { createAnalyticsIdentity } from './analyticsIdentity';
import posthog from 'posthog-js';
import { Airport } from '../data/airports';
import { haversineKm } from '../utils/flightCalculations';

// ---------------------------------------------------------------------------
// Analytics — thin PostHog wrapper. This is the ONLY file that imports
// posthog; everything else calls track().
//
// Policy: account IDs identify signed-in users; guests remain anonymous. No cookies (localStorage persistence), no
// autocapture, no session recording, prod builds only. Without a
// VITE_POSTHOG_KEY the whole module is a silent no-op, so local dev and
// forks never send events.
// ---------------------------------------------------------------------------

let enabled = false;
const identity = createAnalyticsIdentity({
  getDistinctId: () => posthog.get_distinct_id(),
  identify: id => posthog.identify(id),
  reset: () => posthog.reset(),
  capture: (event, props, instant) => posthog.capture(event, { experience_version: 'passport_goals_v1', identity_version: 'account_v1', ...props }, instant ? { transport: 'sendBeacon', send_instantly: true } : undefined),
});

export function setAnalyticsUser(userId: string | null): void {
  // No SDK calls occur until production initialization completes.
  identity.setUser(userId);
}

export function initAnalytics(): void {
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  if (!import.meta.env.PROD || !key) return;

  posthog.init(key, {
    api_host: (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com',
    persistence: 'localStorage',
    autocapture: false,
    capture_pageview: false,
    person_profiles: 'identified_only',
    loaded: () => identity.ready(),
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
    if (import.meta.env?.DEV) console.debug('[analytics]', event, props);
    return;
  }
  // instant: bypass the batch queue (~3s flush) — required for events fired
  // during pagehide, where the queued batch would die with the page
  identity.capture(event, props, opts?.instant);
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
