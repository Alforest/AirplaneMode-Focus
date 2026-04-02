import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useHistoryStore } from '../../store/historyStore';
import { formatDuration } from '../../utils/flightCalculations';

const RecentFlights: React.FC = () => {
  const flights = useHistoryStore(s => s.flights);
  const clearHistory = useHistoryStore(s => s.clearHistory);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!flights.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(240,192,64,0.2)" strokeWidth="1.5" strokeLinecap="round">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>
        <p className="font-mono text-muted-white/25 text-xs uppercase tracking-widest text-center">
          No flights yet — complete your first session
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* List */}
      <div className="divide-y divide-gold/5">
        {flights.slice(0, 8).map((flight, i) => {
          const date = new Date(flight.date);
          const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          return (
            <motion.div
              key={flight.id}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="group flex items-center gap-4 py-3.5 px-1 hover:bg-gold/[0.03] transition-colors duration-150"
              style={{ borderLeft: '2px solid transparent' }}
              onMouseEnter={e => (e.currentTarget.style.borderLeftColor = 'rgba(240,192,64,0.3)')}
              onMouseLeave={e => (e.currentTarget.style.borderLeftColor = 'transparent')}
            >
              {/* Route */}
              <div className="flex-1 min-w-0">
                <div className="font-mono text-gold font-bold text-sm tracking-wide">
                  {flight.departure.iata} → {flight.destination.iata}
                </div>
                <div className="font-sans text-muted-white/40 text-xs mt-0.5 truncate">
                  {flight.departure.city} → {flight.destination.city}
                </div>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-5 shrink-0">
                <div className="text-right hidden sm:block">
                  <div className="font-mono text-muted-white/60 text-xs">
                    {formatDuration(flight.durationMinutes)}
                  </div>
                  <div className="font-mono text-muted-white/25 text-xs">
                    {flight.distanceKm.toLocaleString()} km
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-muted-white/30 text-xs">{dateStr}</div>
                  <div className="font-mono text-muted-white/20 text-xs">{flight.flightNumber}</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Clear history */}
      {flights.length > 0 && (
        <div className="mt-6 flex justify-end">
          {confirmClear ? (
            <div className="flex items-center gap-3">
              <span className="font-mono text-muted-white/30 text-xs">Clear all history?</span>
              <button
                onClick={() => { clearHistory(); setConfirmClear(false); }}
                className="font-mono text-xs text-red-400/60 hover:text-red-400 transition-colors tracking-widest uppercase"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="font-mono text-xs text-muted-white/30 hover:text-muted-white/60 transition-colors tracking-widest uppercase"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="font-mono text-xs text-muted-white/15 hover:text-muted-white/30 transition-colors tracking-widest uppercase"
            >
              Clear history
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RecentFlights;
