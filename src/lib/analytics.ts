import posthog from 'posthog-js';

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
  if (!enabled) return;
  // instant: bypass the batch queue (~3s flush) — required for events fired
  // during pagehide, where the queued batch would die with the page
  posthog.capture(event, props, opts?.instant ? { transport: 'sendBeacon', send_instantly: true } : undefined);
}
