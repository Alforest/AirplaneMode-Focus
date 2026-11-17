import AccountDialog from './components/account/AccountDialog';
import { useAccount } from './hooks/useAccount';
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFlightStore } from './store/flightStore';
import Hero from './components/landing/Hero';
import DeparturesBoard from './components/departures/DeparturesBoard';
import BoardingConfirm from './components/boarding/BoardingConfirm';
import TrackerPage from './components/tracker/TrackerPage';
import LandedScreen from './components/shared/LandedScreen';
import DevToolbar from './components/shared/DevToolbar';
import ContactPage from './components/shared/ContactPage';

const pageVariants = {
  initial: { opacity: 0, x: 60 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
};

const App: React.FC = () => {
  useAccount();
  const { phase } = useFlightStore();
  const [contactOpen, setContactOpen] = useState(() => window.location.hash === '#contact');

  useEffect(() => {
    const updatePage = () => setContactOpen(window.location.hash === '#contact');
    window.addEventListener('hashchange', updatePage);
    return () => window.removeEventListener('hashchange', updatePage);
  }, []);

  if (contactOpen) return <ContactPage />;

  return (
    <div className="min-h-screen bg-navy text-muted-white font-sans">
      <AnimatePresence mode="wait">
        {phase === 'landing' && (
          <motion.div
            key="landing"
            onAnimationComplete={definition => {
              if (definition !== 'animate') return;
              const anchor = window.location.hash;
              if (anchor !== '#terminal' && anchor !== '#challenge') return;
              const target = document.getElementById(anchor.slice(1));
              target?.focus({ preventScroll: true });
              if (anchor === '#terminal') window.scrollTo({ top: 0 });
              else target?.scrollIntoView({ block: 'start' });
            }}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4 }}
          >
            <Hero />
          </motion.div>
        )}

        {phase === 'departures' && (
          <motion.div
            key="departures"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4 }}
          >
            <DeparturesBoard />
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
            <BoardingConfirm />
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

      <AccountDialog />

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
