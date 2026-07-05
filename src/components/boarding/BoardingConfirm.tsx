import React from 'react';
import { motion } from 'framer-motion';
import { useFlightStore } from '../../store/flightStore';
import BoardingPassCard from './BoardingPassCard';

const BoardingConfirm: React.FC = () => {
  const { departure, destination, flightInfo, durationMinutes, startFlight, setPhase } = useFlightStore();

  const [boarding, setBoarding] = React.useState(false);

  if (!departure || !destination || !flightInfo) return null;

  const handleBoard = () => {
    setBoarding(true);
    setTimeout(() => startFlight(), 900);
  };

  return (
    <div className="min-h-screen bg-navy relative overflow-hidden">
      {/* Background stars */}
      <div className="stars-container absolute inset-0 opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-navy via-midnight/30 to-navy pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <button
            onClick={() => setPhase('departures')}
            className="absolute left-4 top-4 text-muted-white/30 hover:text-muted-white/60
            font-mono text-sm tracking-wider transition-colors flex items-center gap-2"
          >
            ← Departures
          </button>

          <div className="font-mono text-gold/50 text-xs uppercase tracking-widest mb-3">
            {flightInfo.airline} · {flightInfo.flightNumber}
          </div>
          <h2 className="font-serif text-4xl md:text-5xl text-muted-white">
            Your <span className="text-gold">Boarding Pass</span>
          </h2>
          <p className="text-muted-white/40 font-sans mt-3 text-sm">
            {Math.floor(durationMinutes / 60)}h{durationMinutes % 60 > 0 ? ` ${durationMinutes % 60}m` : ''} study session to {destination.city}
          </p>
        </motion.div>

        {/* Single boarding pass */}
        <div className="max-w-md mx-auto">
          <motion.div
            animate={boarding ? { scale: 1.05, y: -10 } : { scale: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <BoardingPassCard
              departure={departure}
              destination={destination}
              flightInfo={flightInfo}
              durationMinutes={durationMinutes}
              index={0}
              onSelect={handleBoard}
            />
          </motion.div>
        </div>

        {/* Hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-muted-white/20 font-mono text-xs mt-8 tracking-widest uppercase"
        >
          Click your boarding pass to begin the flight
        </motion.p>
      </div>
    </div>
  );
};

export default BoardingConfirm;
