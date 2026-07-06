import React, { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { useHistoryStore } from '../../store/historyStore';
import HistoryStats from './HistoryStats';
import RecentFlights from './RecentFlights';

// Lazy: FlightGlobe pulls mapbox-gl — don't make the landing page pay for it.
// It's only rendered once flights exist; first-time visitors get the static
// empty state below and never download the mapbox chunk.
const FlightGlobe = lazy(() => import('./FlightGlobe'));

const GlobeEmptyState: React.FC = () => (
  <div
    className="w-full h-full rounded-2xl flex flex-col items-center justify-center gap-5"
    style={{ background: '#030508', border: '1px solid rgba(240,192,64,0.08)' }}
  >
    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="rgba(240,192,64,0.15)" strokeWidth="0.8">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
    <p className="font-mono text-muted-white/25 text-xs uppercase tracking-widest text-center leading-relaxed px-8">
      Complete your first flight<br />to see your routes on the globe
    </p>
  </div>
);

const FlightHistorySection: React.FC = () => {
  const flights = useHistoryStore(s => s.flights);

  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      style={{ background: '#06080f' }}
      className="py-14 px-4"
    >
      <div style={{ maxWidth: 860 }} className="mx-auto">

        {/* Section header */}
        <div className="flex items-center gap-4 mb-8">
          <h2 style={{
            color: 'rgba(240,192,64,0.35)',
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}>
            Your Flight Log
          </h2>
          <div className="flex-1 h-px" style={{ background: 'rgba(240,192,64,0.08)' }} />
          {flights.length > 0 && (
            <span style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: '0.68rem',
              color: 'rgba(240,192,64,0.25)',
              letterSpacing: '0.1em',
            }}>
              {flights.length} {flights.length === 1 ? 'flight' : 'flights'} logged
            </span>
          )}
        </div>

        {/* Globe + Stats row */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* Globe */}
          <div className="flex-1 md:basis-[58%] h-[340px] md:h-[480px]">
            {flights.length > 0 ? (
              <Suspense fallback={<div className="w-full h-full rounded-2xl" style={{ background: '#030508', border: '1px solid rgba(240,192,64,0.08)' }} />}>
                <FlightGlobe flights={flights} />
              </Suspense>
            ) : (
              <GlobeEmptyState />
            )}
          </div>

          {/* Stats */}
          <div className="md:basis-[40%] flex flex-col justify-center gap-3">
            <HistoryStats />
          </div>
        </div>

        {/* Recent flights */}
        {flights.length > 0 && (
          <div
            style={{
              background: '#030508',
              border: '1px solid rgba(240,192,64,0.08)',
              borderRadius: 10,
              padding: '1.25rem',
            }}
          >
            <div style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: '0.68rem',
              color: 'rgba(208,216,232,0.2)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: '0.5rem',
            }}>
              Recent Flights
            </div>
            <RecentFlights />
          </div>
        )}

      </div>
    </motion.section>
  );
};

export default FlightHistorySection;
