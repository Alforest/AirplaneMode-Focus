import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initAnalytics, track } from './lib/analytics';
import { useFlightStore } from './store/flightStore';
import './index.css';

initAnalytics();

// Closing the tab mid-flight is an abandonment too (posthog flushes via
// sendBeacon on pagehide). Registered here, not in analytics.ts, to keep
// analytics free of store imports.
window.addEventListener('pagehide', () => {
  const { phase, departure, destination, durationMinutes, startTime } =
    useFlightStore.getState();
  if (phase !== 'tracker' || !startTime) return;
  track('flight_abandoned', {
    departure: departure?.iata,
    destination: destination?.iata,
    duration_minutes: durationMinutes,
    elapsed_minutes: Math.round((Date.now() - startTime) / 60000),
    via: 'pagehide',
  }, { instant: true });
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
