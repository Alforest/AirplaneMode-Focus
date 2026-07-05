import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { findAirportByIata } from '../../data/airports';
import { useFlightStore } from '../../store/flightStore';

const InputForm: React.FC = () => {
  const { setDeparture } = useFlightStore();

  const [iataValue, setIataValue] = useState('');
  const [iataError, setIataError] = useState('');

  const handleIataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().slice(0, 3);
    setIataValue(val);
    if (iataError) setIataError('');
  };

  const handleIataBlur = () => {
    if (iataValue.length === 0) return;
    if (iataValue.length < 3) {
      setIataError('Airport codes are 3 letters (e.g. JFK, LAX, LHR)');
      return;
    }
    const airport = findAirportByIata(iataValue);
    if (!airport) {
      setIataError(`"${iataValue}" not found. Check your 3-letter IATA code (e.g. JFK, LHR, DXB)`);
    } else {
      setIataError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (iataValue.length !== 3) {
      setIataError('Enter your 3-letter departure airport code');
      return;
    }
    const airport = findAirportByIata(iataValue);
    if (!airport) {
      setIataError(`"${iataValue}" not found. Check your 3-letter IATA code (e.g. JFK, LHR, DXB)`);
      return;
    }

    setIataError('');
    setDeparture(airport); // → departures board
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card p-8 rounded-2xl text-left space-y-6">
      {/* Airport input */}
      <div>
        <label className="block text-muted-white/60 text-xs font-mono uppercase tracking-widest mb-2">
          Departing from
        </label>
        <div className="relative">
          <input
            type="text"
            value={iataValue}
            onChange={handleIataChange}
            onBlur={handleIataBlur}
            placeholder="JFK"
            maxLength={3}
            className={`w-full bg-midnight/80 border ${
              iataError ? 'border-red-500/60' : 'border-gold/20'
            } rounded-xl px-5 py-4 text-gold font-mono text-3xl uppercase tracking-widest text-center
            focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/10
            placeholder:text-muted-white/20 transition-all duration-200`}
            autoComplete="off"
            spellCheck={false}
          />
          {iataValue && !iataError && findAirportByIata(iataValue) && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-center text-muted-white/50 text-sm font-sans"
            >
              {findAirportByIata(iataValue)?.city}, {findAirportByIata(iataValue)?.country}
            </motion.div>
          )}
          {iataError && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-red-400/80 text-sm font-sans"
            >
              {iataError}
            </motion.div>
          )}
        </div>
        <p className="mt-3 text-muted-white/30 text-xs font-sans">
          Your departure board shows real routes — the flight you pick sets your study duration.
        </p>
      </div>

      {/* Submit */}
      <motion.button
        type="submit"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full bg-gold hover:bg-amber text-navy font-mono font-bold
        text-lg py-4 rounded-xl tracking-widest uppercase transition-colors duration-200
        flex items-center justify-center gap-3"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>
        View Departures
      </motion.button>
    </form>
  );
};

export default InputForm;
