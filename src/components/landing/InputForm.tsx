import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { findAirportByIata } from '../../data/airports';
import { findDestinations } from '../../utils/flightCalculations';
import { useFlightStore } from '../../store/flightStore';

const InputForm: React.FC = () => {
  const { setDeparture, setGeneratedDestinations, setDuration, setPhase } = useFlightStore();

  const [iataValue, setIataValue] = useState('');
  const [hours, setHours] = useState(2);
  const [minutes, setMinutes] = useState(0);
  const [iataError, setIataError] = useState('');
  const [durationError, setDurationError] = useState('');

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
      setIataError(`"${iataValue}" not found. Try major airports like JFK, LHR, DXB`);
    } else {
      setIataError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const totalMinutes = hours * 60 + minutes;

    // Validate
    if (iataValue.length !== 3) {
      setIataError('Enter your 3-letter departure airport code');
      return;
    }
    const airport = findAirportByIata(iataValue);
    if (!airport) {
      setIataError(`"${iataValue}" not found. Try major airports like JFK, LHR, DXB`);
      return;
    }
    if (totalMinutes < 30) {
      setDurationError('Minimum flight time is 30 minutes');
      return;
    }

    setDurationError('');
    setIataError('');

    const destinations = findDestinations(airport, totalMinutes);
    setDeparture(airport);
    setGeneratedDestinations(destinations);
    setDuration(totalMinutes);
    setPhase('boarding');
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
      </div>

      {/* Duration input */}
      <div>
        <label className="block text-muted-white/60 text-xs font-mono uppercase tracking-widest mb-2">
          Study duration
        </label>
        <div className="flex gap-3">
          <div className="flex-1">
            <select
              value={hours}
              onChange={(e) => { setHours(Number(e.target.value)); setDurationError(''); }}
              className="w-full bg-midnight/80 border border-gold/20 rounded-xl px-4 py-4
              text-muted-white font-mono text-xl text-center cursor-pointer
              focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/10
              transition-all duration-200 appearance-none"
            >
              {Array.from({ length: 13 }, (_, i) => (
                <option key={i} value={i}>{i}h</option>
              ))}
            </select>
          </div>
          <div className="flex items-center text-gold/40 font-mono text-2xl pb-1">:</div>
          <div className="flex-1">
            <select
              value={minutes}
              onChange={(e) => { setMinutes(Number(e.target.value)); setDurationError(''); }}
              className="w-full bg-midnight/80 border border-gold/20 rounded-xl px-4 py-4
              text-muted-white font-mono text-xl text-center cursor-pointer
              focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/10
              transition-all duration-200 appearance-none"
            >
              {[0, 15, 30, 45].map((m) => (
                <option key={m} value={m}>{String(m).padStart(2, '0')}m</option>
              ))}
            </select>
          </div>
        </div>
        {durationError && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-red-400/80 text-sm font-sans"
          >
            {durationError}
          </motion.div>
        )}
        <p className="mt-2 text-muted-white/30 text-xs font-sans">
          {hours * 60 + minutes > 0
            ? `Flying distance: ~${Math.round(((hours * 60 + minutes) / 60) * 885).toLocaleString()} km`
            : 'Enter a duration above'}
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
        Choose Your Flight
      </motion.button>
    </form>
  );
};

export default InputForm;
