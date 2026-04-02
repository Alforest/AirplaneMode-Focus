import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFlightStore } from '../../store/flightStore';
import { generateFlightInfo } from '../../utils/generateFlightInfo';
import BoardingPassCard from './BoardingPassCard';

const BoardingPassSelection: React.FC = () => {
  const {
    departure,
    destination,
    generatedDestinations,
    durationMinutes,
    selectDestination,
    startFlight,
    setPhase,
  } = useFlightStore();

  // Generate flight info for each destination once (stable)
  const flightInfos = useMemo(
    () => generatedDestinations.map(() => generateFlightInfo()),
    [generatedDestinations]
  );

  const [selectedIdx, setSelectedIdx] = React.useState<number | null>(null);

  const handleSelect = (idx: number) => {
    const dest = generatedDestinations[idx];
    const info = flightInfos[idx];
    setSelectedIdx(idx);
    selectDestination(dest, info);

    // Animate then go to tracker
    setTimeout(() => {
      startFlight();
    }, 900);
  };

  if (!departure || generatedDestinations.length === 0) return null;

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
            onClick={() => setPhase('landing')}
            className="absolute left-4 top-4 text-muted-white/30 hover:text-muted-white/60
            font-mono text-sm tracking-wider transition-colors flex items-center gap-2"
          >
            ← Back
          </button>

          <div className="font-mono text-gold/50 text-xs uppercase tracking-widest mb-3">
            Departing from{' '}
            <span className="text-gold font-bold">{departure.iata}</span>{' '}
            &mdash; {departure.city}
          </div>
          <h2 className="font-serif text-4xl md:text-5xl text-muted-white">
            Choose Your <span className="text-gold">Destination</span>
          </h2>
          <p className="text-muted-white/40 font-sans mt-3 text-sm">
            3 flights matching your {Math.floor(durationMinutes / 60)}h {durationMinutes % 60 > 0 ? `${durationMinutes % 60}m` : ''} study session
          </p>
        </motion.div>

        {/* Boarding passes */}
        <AnimatePresence>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {generatedDestinations.map((dest, idx) => (
              <motion.div
                key={dest.iata}
                animate={
                  selectedIdx !== null && selectedIdx !== idx
                    ? { opacity: 0, scale: 0.85, y: 20 }
                    : selectedIdx === idx
                    ? { scale: 1.05, y: -10 }
                    : { opacity: 1, scale: 1, y: 0 }
                }
                transition={{ duration: 0.4 }}
              >
                <BoardingPassCard
                  departure={departure}
                  destination={dest}
                  flightInfo={flightInfos[idx]}
                  durationMinutes={durationMinutes}
                  index={idx}
                  onSelect={() => handleSelect(idx)}
                />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>

        {/* Hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-muted-white/20 font-mono text-xs mt-8 tracking-widest uppercase"
        >
          Click a boarding pass to begin your flight
        </motion.p>
      </div>
    </div>
  );
};

export default BoardingPassSelection;
