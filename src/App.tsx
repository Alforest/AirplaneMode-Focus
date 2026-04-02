import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFlightStore } from './store/flightStore';
import Hero from './components/landing/Hero';
import BoardingPassSelection from './components/boarding/BoardingPassSelection';
import TrackerPage from './components/tracker/TrackerPage';
import LandedScreen from './components/shared/LandedScreen';
import DevToolbar from './components/shared/DevToolbar';

const pageVariants = {
  initial: { opacity: 0, x: 60 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
};

const App: React.FC = () => {
  const { phase } = useFlightStore();

  return (
    <div className="min-h-screen bg-navy text-muted-white font-sans">
      <AnimatePresence mode="wait">
        {phase === 'landing' && (
          <motion.div
            key="landing"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4 }}
          >
            <Hero />
          </motion.div>
        )}

        {phase === 'boarding' && (
          <motion.div
            key="boarding"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4 }}
          >
            <BoardingPassSelection />
          </motion.div>
        )}

        {(phase === 'tracker' || phase === 'landed') && (
          <motion.div
            key="tracker"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4 }}
          >
            <TrackerPage />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dev toolbar — only in development */}
      {import.meta.env.DEV && <DevToolbar />}

      {/* Landed overlay (on top of tracker) */}
      <AnimatePresence>
        {phase === 'landed' && (
          <motion.div
            key="landed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <LandedScreen />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
