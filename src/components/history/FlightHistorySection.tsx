import React from 'react';
import { motion } from 'framer-motion';
import { useHistoryStore } from '../../store/historyStore';
import FlightGlobe from './FlightGlobe';
import HistoryStats from './HistoryStats';
import RecentFlights from './RecentFlights';

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
          <span style={{
            color: 'rgba(240,192,64,0.35)',
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}>
            Your Flight Log
          </span>
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
          <div className="flex-1 md:basis-[58%]" style={{ height: 480 }}>
            <FlightGlobe flights={flights} />
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
