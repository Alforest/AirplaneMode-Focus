import React, { useState } from 'react';
import { motion } from 'framer-motion';
import MapView from './MapView';
import StudyTimer from './StudyTimer';
import FlightStats from './FlightStats';
import { useFlightStore } from '../../store/flightStore';

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
  const [zoomIdx, setZoomIdx] = useState(2); // default: "Country" (zoom 5)

  const targetZoom = ZOOM_LEVELS[zoomIdx].zoom;

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-6 py-4 border-b border-gold/10 shrink-0"
      >
        {/* Left: flight info */}
        <div className="flex items-center gap-4">
          <div>
            <div className="font-mono text-muted-white/30 text-xs uppercase tracking-widest">Flight</div>
            <div className="font-mono text-gold font-bold text-lg">{flightInfo?.flightNumber}</div>
          </div>
          <div className="w-px h-8 bg-gold/10" />
          <div>
            <div className="font-mono text-muted-white/30 text-xs uppercase tracking-widest">Route</div>
            <div className="font-mono text-muted-white/70 text-sm">
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
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
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
          className="flex-1 relative flex"
          style={{ minHeight: '50vh' }}
        >
          {/* Map */}
          <div className="absolute inset-2 md:inset-4">
            <MapView targetZoom={targetZoom} />
          </div>

          {/* Zoom slider — floats over the left edge of the map */}
          <div className="absolute left-5 md:left-7 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-0">
            <div className="font-mono text-muted-white/30 text-xs uppercase tracking-widest mb-3 -rotate-90 whitespace-nowrap"
              style={{ writingMode: 'initial' }}>
            </div>
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
                    onClick={() => setZoomIdx(actualIdx)}
                    title={level.label}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${
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
              {/* Plus / minus labels */}
              <div className="mt-1 flex flex-col items-center gap-0.5">
                <span className="font-mono text-muted-white/15 text-xs">−</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right panel: timer + stats */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full md:w-72 flex flex-col gap-4 p-4 border-t md:border-t-0 md:border-l border-gold/10 bg-midnight/40 shrink-0"
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
