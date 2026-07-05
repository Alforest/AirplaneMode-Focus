import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { findAirportByIata } from '../../data/airports';
import { useFlightStore } from '../../store/flightStore';

const CELLS = [0, 1, 2];

// ---------------------------------------------------------------------------
// InputForm — split-flap check-in field. Three big flip cells backed by a
// hidden input (so focus, typing, paste, and mobile keyboards all work).
// ---------------------------------------------------------------------------

const InputForm: React.FC = () => {
  const { setDeparture } = useFlightStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);

  const airport = value.length === 3 ? findAirportByIata(value) : undefined;
  const activeCell = Math.min(value.length, 2);
  const idle = !focused && value.length === 0; // nothing typed, not focused → beckon

  // Autofocus on devices with a physical pointer/keyboard — on touch devices
  // this would pop the keyboard over the hero, so skip it there
  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus();
  }, []);

  const focusInput = () => inputRef.current?.focus();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    setValue(val);
    if (error) setError('');
  };

  const handleClear = () => {
    setValue('');
    setError('');
    focusInput();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (value.length !== 3) {
      setError('Enter your 3-letter departure airport code');
      focusInput();
      return;
    }
    const ap = findAirportByIata(value);
    if (!ap) {
      setError(`"${value}" not found. Check your 3-letter IATA code (e.g. JFK, LHR, DXB)`);
      return;
    }

    setError('');
    setDeparture(ap); // → departures board
  };

  return (
    <form onSubmit={handleSubmit} className="text-left">
      <label
        onClick={focusInput}
        className={`block text-xs font-mono uppercase tracking-[0.2em] mb-3 cursor-text transition-colors duration-300
        ${idle ? 'text-gold/70' : 'text-muted-white/50'}`}
      >
        Departing from
      </label>

      <div className="flex items-stretch gap-4">
        {/* Flip cells + hidden input — the whole padded group is clickable */}
        <div
          className="relative flex gap-2 cursor-text"
          onClick={focusInput}
          style={{ padding: '6px', margin: '-6px' }}
        >
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            maxLength={3}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-label="Departure airport IATA code"
            className="absolute inset-0 w-full h-full opacity-0 cursor-text"
          />
          {CELLS.map(i => {
            const ch = value[i] ?? '';
            const isActive = focused && i === activeCell && value.length < 3;
            return (
              <motion.div
                key={i}
                animate={
                  idle
                    ? { borderColor: ['rgba(240,192,64,0.18)', 'rgba(240,192,64,0.6)', 'rgba(240,192,64,0.18)'] }
                    : {
                        borderColor: isActive
                          ? 'rgba(240,192,64,0.75)'
                          : focused
                            ? 'rgba(240,192,64,0.45)'
                            : 'rgba(240,192,64,0.18)',
                      }
                }
                transition={idle
                  ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.25 }
                  : { duration: 0.15 }}
                style={{
                  width: '3.4rem',
                  height: '4.2rem',
                  background: '#07090e',
                  border: '1px solid rgba(240,192,64,0.18)',
                  borderRadius: 6,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  pointerEvents: 'none',
                }}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={ch || `empty-${i}`}
                    initial={{ rotateX: -90, opacity: 0 }}
                    animate={{ rotateX: 0, opacity: 1 }}
                    exit={{ rotateX: 90, opacity: 0 }}
                    transition={{ duration: 0.16 }}
                    className="font-mono font-bold text-gold"
                    style={{ fontSize: '2.1rem', lineHeight: 1 }}
                  >
                    {ch || (isActive ? (
                      <motion.span
                        animate={{ opacity: [1, 0.15, 1] }}
                        transition={{ duration: 1.1, repeat: Infinity }}
                        style={{ color: 'rgba(240,192,64,0.45)' }}
                      >
                        _
                      </motion.span>
                    ) : (
                      <span style={{ color: idle ? 'rgba(240,192,64,0.28)' : 'rgba(208,216,232,0.12)' }}>
                        {'JFK'[i]}
                      </span>
                    ))}
                  </motion.span>
                </AnimatePresence>
                {/* split-flap hinge line */}
                <span style={{
                  position: 'absolute',
                  left: 0, right: 0, top: '50%',
                  height: '1px',
                  background: 'rgba(0,0,0,0.6)',
                  pointerEvents: 'none',
                }} />
              </motion.div>
            );
          })}
        </div>

        {/* Clear — generous hit area, shown as soon as anything is typed */}
        <AnimatePresence>
          {value.length > 0 && (
            <motion.button
              type="button"
              onClick={handleClear}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              aria-label="Clear airport code"
              className="self-center -mx-2 px-3 py-3 font-mono text-base
              text-muted-white/35 hover:text-gold transition-colors duration-150"
            >
              ✕
            </motion.button>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.button
          type="submit"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="bg-gold hover:bg-amber text-navy font-mono font-bold
          px-6 rounded-lg tracking-widest uppercase transition-colors duration-200
          flex items-center gap-2.5"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
          Depart
        </motion.button>
      </div>

      {/* Confirmation / error / hint */}
      <div className="mt-3 min-h-[1.5rem]">
        {airport && !error && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-sm text-gold/70"
          >
            {airport.city}, {airport.country}
          </motion.p>
        )}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-400/80 text-sm font-sans"
          >
            {error}
          </motion.p>
        )}
        {!airport && !error && (
          <p className={`text-xs font-sans transition-colors duration-300 ${idle ? 'text-muted-white/50' : 'text-muted-white/30'}`}>
            {value.length === 0
              ? 'Type your 3-letter airport code — JFK, LHR, MAD…'
              : 'Real routes — the flight you pick sets your study duration.'}
          </p>
        )}
      </div>
    </form>
  );
};

export default InputForm;
