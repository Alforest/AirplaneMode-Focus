import React, { useState } from 'react';
import { motion } from 'framer-motion';
import MapView from './MapView';
import StudyTimer from './StudyTimer';
import FlightStats from './FlightStats';
import AdSlot from './AdSlot';
import { useFlightStore } from '../../store/flightStore';
import { useFlightProgress, getFlightStatus } from '../../hooks/useFlightProgress';
import { useIsPhone } from '../../hooks/useMediaQuery';

// Floating countdown over the map — phones only, where the full timer panel
// lives below the fold
const MobileTimerChip: React.FC = () => {
  const { progress, remainingSeconds } = useFlightProgress();
  const status = getFlightStatus(progress);

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

const ZOOM_LEVELS = [
  { zoom: 4,  label: 'World' },
  { zoom: 6,  label: 'Region' },
  { zoom: 7,  label: 'Country' },
  { zoom: 8.5, label: 'City' },
  { zoom: 11,  label: 'Close' },
];

const TrackerPage: React.FC = () => {
  const { departure, destination, flightInfo } = useFlightStore();
  const isPhone = useIsPhone();
  const [zoomIdx, setZoomIdx] = useState(2); // default: "Country" (zoom 5)
  const [zoomOpen, setZoomOpen] = useState(false); // phones: slider collapsed by default

  const targetZoom = ZOOM_LEVELS[zoomIdx].zoom;

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-gold/10 shrink-0"
      >
        {/* Left: flight info */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div>
            <div className="font-mono text-muted-white/30 text-xs uppercase tracking-widest">Flight</div>
            <div className="font-mono text-gold font-bold text-base sm:text-lg">{flightInfo?.flightNumber}</div>
          </div>
          <div className="w-px h-8 bg-gold/10 shrink-0" />
          <div className="min-w-0">
            <div className="font-mono text-muted-white/30 text-xs uppercase tracking-widest">Route</div>
            <div className="font-mono text-muted-white/70 text-sm whitespace-nowrap">
              {departure?.iata} → {destination?.iata}
            </div>
          </div>
        </div>

        {/* Center: airline */}
        <div className="hidden md:block text-center">
          <div className="font-mono text-muted-white/60 text-lg">
            {flightInfo?.airline}
          </div>
          <div className="font-mono text-muted-white/25 text-xs">{flightInfo?.aircraft}</div>
        </div>

        {/* Right: seat */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="font-mono text-muted-white/30 text-xs uppercase tracking-widest">Seat</div>
            <div className="font-mono text-gold font-bold">{flightInfo?.seat}</div>
          </div>
        </div>
      </motion.div>

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
            <MapView targetZoom={targetZoom} />
          </div>

          {/* Countdown floats over the map on phones */}
          <MobileTimerChip />

          {/* Zoom slider — floats over the left edge of the map.
              On phones it collapses to a single button so it doesn't cover
              the map or crowd the countdown chip. */}
          <div className="absolute left-4 md:left-7 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-0">
            {isPhone && !zoomOpen ? (
              <button
                onClick={() => setZoomOpen(true)}
                aria-label="Open zoom controls"
                className="glass-card rounded-xl w-11 h-11 flex flex-col items-center justify-center gap-0.5"
                style={{ border: '1px solid rgba(240,192,64,0.15)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(240,192,64,0.8)" strokeWidth="2.2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="16.5" y1="16.5" x2="21" y2="21" />
                </svg>
                <span className="font-mono text-gold/60 text-[0.55rem] font-bold leading-none">
                  {zoomIdx + 1}
                </span>
              </button>
            ) : (
              <div className="glass-card rounded-2xl px-2 py-3 flex flex-col items-center gap-1"
                style={{ border: '1px solid rgba(240,192,64,0.12)' }}>
                {/* Zoom label */}
                <div className="font-mono text-gold/60 text-xs tracking-widest mb-1">
                  {ZOOM_LEVELS[zoomIdx].label}
                </div>
                {/* Steps (top = most zoomed in, bottom = most zoomed out) */}
                {[...ZOOM_LEVELS].reverse().map((level, reversedIdx) => {
                  const actualIdx = ZOOM_LEVELS.length - 1 - reversedIdx;
                  const isActive = actualIdx === zoomIdx;
                  return (
                    <button
                      key={level.zoom}
                      onClick={() => {
                        setZoomIdx(actualIdx);
                        if (isPhone) setZoomOpen(false); // picked a level → tuck away
                      }}
                      title={level.label}
                      className={`w-8 h-8 md:w-7 md:h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${
                        isActive
                          ? 'bg-gold text-navy'
                          : 'text-muted-white/30 hover:text-gold hover:bg-gold/10'
                      }`}
                    >
                      <span className="font-mono text-xs font-bold">
                        {ZOOM_LEVELS.length - reversedIdx}
                      </span>
                    </button>
                  );
                })}
                {/* Close (phones) / minus label (desktop) */}
                {isPhone ? (
                  <button
                    onClick={() => setZoomOpen(false)}
                    aria-label="Close zoom controls"
                    className="mt-1 w-8 h-8 rounded-lg flex items-center justify-center text-muted-white/40 active:text-gold"
                  >
                    <span className="font-mono text-sm leading-none">✕</span>
                  </button>
                ) : (
                  <div className="mt-1 flex flex-col items-center gap-0.5">
                    <span className="font-mono text-muted-white/15 text-xs">−</span>
                  </div>
                )}
              </div>
            )}
          </div>
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

          {/* Additional info */}
          <div className="glass-card rounded-xl px-4 py-3 text-center">
            <div className="font-mono text-muted-white/25 text-xs uppercase tracking-widest mb-1">
              Study Tip
            </div>
            <div className="font-sans text-muted-white/50 text-xs leading-relaxed">
              Phones on airplane mode means fewer interruptions. Stay focused — you're almost there.
            </div>
          </div>

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
