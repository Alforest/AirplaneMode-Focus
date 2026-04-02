import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useFlightStore } from '../../store/flightStore';
import { useHistoryStore } from '../../store/historyStore';
import { haversineKm, formatDuration } from '../../utils/flightCalculations';

// Confetti particle
const Particle: React.FC<{ delay: number; x: number; color: string }> = ({ delay, x, color }) => (
  <motion.div
    className="absolute top-0 w-2 h-2 rounded-sm pointer-events-none"
    style={{ left: `${x}%`, background: color }}
    initial={{ y: -20, opacity: 1, rotate: 0, scale: 1 }}
    animate={{
      y: '100vh',
      opacity: [1, 1, 0],
      rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
      x: [(Math.random() - 0.5) * 200, (Math.random() - 0.5) * 400],
      scale: [1, 0.8, 0.4],
    }}
    transition={{
      duration: 3 + Math.random() * 2,
      delay: delay,
      ease: 'easeIn',
    }}
  />
);

const CONFETTI_COLORS = ['#f0c040', '#e8a020', '#ffffff', '#d0d8e8', '#7ec8e3', '#ffd700'];

const LandedScreen: React.FC = () => {
  const { departure, destination, durationMinutes, flightInfo, reset } = useFlightStore();
  const addFlight = useHistoryStore(s => s.addFlight);
  const savedRef = useRef(false);
  const [loggedBadge, setLoggedBadge] = useState(false);

  const particles = useRef(
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      delay: Math.random() * 1.5,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    }))
  );

  const totalDistKm =
    departure && destination
      ? Math.round(haversineKm(departure.lat, departure.lon, destination.lat, destination.lon))
      : 0;

  // Save flight to history once on mount
  useEffect(() => {
    if (savedRef.current || !departure || !destination || !flightInfo) return;
    savedRef.current = true;
    addFlight({
      id: crypto.randomUUID(),
      departure: { iata: departure.iata, city: departure.city, country: departure.country, lat: departure.lat, lon: departure.lon },
      destination: { iata: destination.iata, city: destination.city, country: destination.country, lat: destination.lat, lon: destination.lon },
      durationMinutes,
      distanceKm: totalDistKm,
      date: new Date().toISOString(),
      flightNumber: flightInfo.flightNumber,
      airline: flightInfo.airline,
    });
    setTimeout(() => setLoggedBadge(true), 1500);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 bg-navy z-50 flex items-center justify-center overflow-hidden">
      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.current.map(p => (
          <Particle key={p.id} delay={p.delay} x={p.x} color={p.color} />
        ))}
      </div>

      {/* Stars bg */}
      <div className="stars-container absolute inset-0 opacity-60" />

      {/* Content */}
      <div className="relative z-10 text-center max-w-xl mx-auto px-6">
        {/* Plane icon */}
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.3 }}
          className="mb-6 flex justify-center"
        >
          <div className="w-24 h-24 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center"
            style={{ boxShadow: '0 0 40px rgba(240,192,64,0.3)' }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="#f0c040">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="font-mono text-gold/60 text-xs uppercase tracking-widest mb-2">
            You've arrived
          </div>
          <h1 className="font-serif text-5xl md:text-6xl text-muted-white mb-1">
            Welcome to
          </h1>
          <h2 className="font-serif text-5xl md:text-6xl text-gold">
            {destination?.city ?? 'Your Destination'}
          </h2>
          <p className="font-sans text-muted-white/40 text-lg mt-2">
            {destination?.country}
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card rounded-2xl px-8 py-6 mt-8 grid grid-cols-3 gap-6"
        >
          <div className="text-center">
            <div className="font-mono text-muted-white/30 text-xs uppercase tracking-widest mb-1">Studied</div>
            <div className="font-mono text-gold text-xl font-bold">
              {formatDuration(durationMinutes)}
            </div>
          </div>
          <div className="text-center border-x border-gold/10">
            <div className="font-mono text-muted-white/30 text-xs uppercase tracking-widest mb-1">Distance</div>
            <div className="font-mono text-gold text-xl font-bold">
              {totalDistKm.toLocaleString()}
              <span className="text-gold/50 text-xs ml-1">km</span>
            </div>
          </div>
          <div className="text-center">
            <div className="font-mono text-muted-white/30 text-xs uppercase tracking-widest mb-1">Flight</div>
            <div className="font-mono text-gold text-lg font-bold">
              {flightInfo?.flightNumber ?? '—'}
            </div>
          </div>
        </motion.div>

        {/* Destination info */}
        {departure && destination && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-4 font-mono text-muted-white/30 text-sm tracking-wider"
          >
            {departure.iata} → {destination.iata} &nbsp;·&nbsp; {flightInfo?.airline}
          </motion.div>
        )}

        {/* Flight log badge */}
        {loggedBadge && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex items-center justify-center gap-2"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f0c040" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="font-mono text-xs text-gold/50 tracking-widest uppercase">
              Added to flight log
            </span>
          </motion.div>
        )}

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          onClick={reset}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="mt-10 bg-gold hover:bg-amber text-navy font-mono font-bold
          px-10 py-4 rounded-xl tracking-widest uppercase text-base
          transition-colors duration-200"
        >
          Book Another Flight
        </motion.button>
      </div>
    </div>
  );
};

export default LandedScreen;
