import React, { Suspense, lazy, useState } from 'react';
import FlightExitDialog from './FlightExitDialog';
import { useFlightBackGuard } from '../../hooks/useFlightBackGuard';
import { motion } from 'framer-motion';

// Lazy: MapView pulls the ~1.7 MB mapbox-gl chunk — keep it off the landing
// page load (Core Web Vitals) and fetch it only when a flight starts
const MapView = lazy(() => import('./MapView'));
import { useChallengeFlight } from '../../lib/challenge';
import StudyTimer from './StudyTimer';
import FlightStats from './FlightStats';
import AdSlot from './AdSlot';
import { useFlightStore } from '../../store/flightStore';
import { useFlightProgress } from '../../hooks/useFlightProgress';

// Floating countdown over the map — phones only, where the full timer panel
// lives below the fold
const MobileTimerChip: React.FC = () => {
  const { remainingSeconds, status } = useFlightProgress();

  const h = Math.floor(remainingSeconds / 3600);
  const m = Math.floor((remainingSeconds % 3600) / 60);
  const s = remainingSeconds % 60;
  const countdown = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return (
    <div className="md:hidden absolute bottom-5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
      <div className="glass-card rounded-2xl px-5 py-2.5 flex items-center gap-4"
        style={{ border: '1px solid rgba(240,192,64,0.18)' }}>
        <span className="font-mono text-gold font-bold text-xl tabular-nums leading-none">
          {countdown}
        </span>
        <span className="w-px h-6 bg-gold/15" />
        <span className="font-mono text-muted-white/50 text-[0.65rem] tracking-widest uppercase whitespace-nowrap">
          {status}
        </span>
      </div>
    </div>
  );
};

const SplitFlapText: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-center justify-center gap-0.5 flex-wrap">
    {text.toUpperCase().split('').map((char, i) =>
      char === ' ' ? (
        <div key={i} style={{ width: '0.6rem' }} />
      ) : (
        <div
          key={i}
          className="relative flex items-center justify-center"
          style={{
            width: '1.5rem',
            height: '2rem',
            backgroundColor: '#060a14',
            border: '1px solid rgba(240,192,64,0.18)',
            borderRadius: '3px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '1rem',
            fontWeight: 700,
            color: '#f0c040',
          }}
        >
          {char}
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            height: '1px',
            backgroundColor: 'rgba(240,192,64,0.18)',
            pointerEvents: 'none',
          }} />
        </div>
      )
    )}
  </div>
);

const TrackerPage: React.FC = () => {
  const { departure, destination, flightInfo, phase, recoveryAvailable } = useFlightStore();
  const [exitOpen, setExitOpen] = useState(false);
  const challenge = useChallengeFlight();
  const sessionId = useFlightStore(state => state.sessionId);
  useFlightBackGuard(phase === 'tracker', sessionId, () => setExitOpen(true));

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <FlightExitDialog open={exitOpen} onClose={() => setExitOpen(false)} />
      {/* Top bar */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-3 items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-gold/10 shrink-0"
      >
        {/* Left: flight info */}
        <div role="group" aria-label="Flight details" className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div>
            <div className="font-mono text-muted-white/30 text-xs uppercase tracking-widest">Flight</div>
            <div className="font-mono text-gold font-bold text-base sm:text-lg">{flightInfo?.flightNumber}</div>
          </div>
          <div className="w-px h-8 bg-gold/10 shrink-0" />
          <div className="min-w-0">
            <div className="font-mono text-muted-white/30 text-xs uppercase tracking-widest">Route</div>
            <div className="font-mono text-muted-white/70 text-xs sm:text-sm whitespace-nowrap">
              {departure?.iata} → {destination?.iata}
            </div>
          </div>
        </div>

        {/* Center: airline */}
        <div role="group" aria-label="Airline details" className="hidden md:block min-w-0 text-center">
          <div className="font-mono text-muted-white/60 text-lg">
            {flightInfo?.airline}
          </div>
          <div className="font-mono text-muted-white/25 text-xs">{flightInfo?.aircraft}</div>
        </div>

        {/* Right: flight actions and seat, independent of the centered airline. */}
        <div className="flex items-center justify-end gap-3 sm:gap-4 min-w-0">
          <button type="button" onClick={() => setExitOpen(true)} className="min-h-[44px] shrink-0 rounded-lg border border-gold/20 px-3 text-sm text-gold hover:bg-gold/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">← Back</button>
          <div className="hidden sm:block text-right">
            <div className="font-mono text-muted-white/30 text-xs uppercase tracking-widest">Seat</div>
            <div className="font-mono text-gold font-bold">{flightInfo?.seat}</div>
          </div>
        </div>
      </motion.header>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row gap-0 overflow-hidden">
        {/* Map + zoom slider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex-1 relative flex min-h-[52dvh] md:min-h-[50vh]"
        >
          {/* Map */}
          <div className="absolute inset-2 md:inset-4">
            <Suspense fallback={<div className="w-full h-full rounded-2xl bg-midnight/40" />}>
              <MapView />
            </Suspense>
          </div>

          {/* Countdown floats over the map on phones */}
          <MobileTimerChip />

        </motion.div>

        {/* Right panel: timer + stats */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full md:w-72 flex flex-col gap-4 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t md:border-t-0 md:border-l border-gold/10 bg-midnight/40 shrink-0 md:overflow-y-auto"
        >
          {/* Route header */}
          <div className="text-center pt-2">
            {destination?.city && <SplitFlapText text={destination.city} />}
            <div className="font-mono text-muted-white/30 text-xs mt-2">
              {destination?.country}
            </div>
          </div>

          {/* Timer */}
          <div className="flex items-center justify-center py-4">
            <StudyTimer />
          </div>

          {/* Flight stats */}
          <FlightStats />
          {challenge.id === sessionId && <p role="status" className="text-xs leading-relaxed text-gold/70">{challenge.message}</p>}

          {/* Additional info */}
          <div className="glass-card rounded-xl px-4 py-3 text-center">
            <div className="font-mono text-muted-white/25 text-xs uppercase tracking-widest mb-1">
              Focus Tip
            </div>
            <div className="font-sans text-muted-white/50 text-xs leading-relaxed">
              Phones on airplane mode means fewer interruptions. Stay focused — you're almost there.
            </div>
          </div>

          {!recoveryAvailable && <p role="status" className="text-xs text-red-300">Recovery is unavailable in this browser. Keep this tab open to finish your session.</p>}

          <AdSlot />

          {/* Footer */}
          <div className="text-center pb-2 mt-auto">
            <div className="font-mono text-muted-white/15 text-xs">
              Gate {flightInfo?.gate} · Terminal {flightInfo?.terminal}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TrackerPage;
