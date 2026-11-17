import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import LandingContent from './components/landing/LandingContent';
import { initAnalytics, track, routeProps } from './lib/analytics';
import { initAds } from './lib/ads';
import { useFlightStore } from './store/flightStore';
import './index.css';

initAnalytics();
initAds();

// Closing the tab mid-flight is an abandonment too (posthog flushes via
// sendBeacon on pagehide). Registered here, not in analytics.ts, to keep
// analytics free of store imports.
window.addEventListener('pagehide', () => {
  const { phase, departure, destination, durationMinutes, startTime } =
    useFlightStore.getState();
  if (phase !== 'tracker' || !startTime) return;
  track('flight_interrupted', {
    ...routeProps(departure, destination, durationMinutes),
    elapsed_minutes: Math.round((Date.now() - startTime) / 60000),
    via: 'pagehide',
    recovery_available: useFlightStore.getState().recoveryAvailable,
  }, { instant: true });
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// This independent root preserves build-rendered marketing content while the
// flight app remains client-rendered. Development has no prerendered markup.
const landingContent = document.getElementById('landing-content')!;
const content = <React.StrictMode><LandingContent /></React.StrictMode>;
if (landingContent.querySelector('section')) {
  ReactDOM.hydrateRoot(landingContent, content);
} else {
  ReactDOM.createRoot(landingContent).render(content);
}
