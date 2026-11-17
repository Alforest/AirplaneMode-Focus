import React, { useEffect, useState } from 'react';
import { useFlightStore } from '../../store/flightStore';
import HowItWorks from './HowItWorks';

// Keep the existing footer content below the app, visible only on the homepage.
// The build renders HowItWorks directly, without importing account/flight state.
export default function LandingContent() {
  const phase = useFlightStore(state => state.phase);
  const [contactOpen, setContactOpen] = useState(false);
  useEffect(() => {
    const update = () => setContactOpen(window.location.hash === '#contact');
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return <div hidden={phase !== 'landing' || contactOpen}><HowItWorks /></div>;
}
