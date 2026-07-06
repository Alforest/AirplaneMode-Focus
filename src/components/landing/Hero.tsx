import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import CloudBackground from '../shared/CloudBackground';
import InputForm from './InputForm';
import DepartureBoard from './DepartureBoard';
import HowItWorks from './HowItWorks';
import FlightHistorySection from '../history/FlightHistorySection';

// ---------------------------------------------------------------------------
// Hero — "terminal split view": airline lockup + clock on top, headline and
// split-flap check-in on the left, live worldwide departure board on the right.
// ---------------------------------------------------------------------------

const Clock: React.FC = () => {
  const [colon, setColon] = useState(true);
  const [nowStr, setNowStr] = useState('');

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setColon(c => !c);
      setNowStr(
        d.getHours().toString().padStart(2, '0') + ':' +
        d.getMinutes().toString().padStart(2, '0')
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className="font-mono text-sm text-gold/50"
      style={{ opacity: colon ? 1 : 0.55, transition: 'opacity 0.1s' }}
    >
      {nowStr}
    </span>
  );
};

const Hero: React.FC = () => {
  return (
    <>
    <div className="relative min-h-screen bg-navy overflow-hidden flex flex-col">
      {/* Star field background */}
      <div className="stars-container absolute inset-0" />

      {/* Cloud layer */}
      <CloudBackground />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy/80 via-transparent to-navy/90 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-navy/60 pointer-events-none" />

      {/* Swooping plane */}
      <motion.div
        className="absolute pointer-events-none"
        initial={{ x: '-20vw', y: '60vh', rotate: -15, opacity: 0 }}
        animate={{ x: '110vw', y: '-10vh', rotate: -15, opacity: [0, 1, 1, 0] }}
        transition={{ duration: 6, ease: 'easeInOut', delay: 0.5 }}
      >
        <svg width="80" height="80" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M56 28L36 32L28 52L22 50L28 32L8 36L4 32L8 28L28 22L22 4L28 2L36 22L56 26L60 28L56 28Z"
            fill="#f0c040"
            opacity="0.9"
          />
        </svg>
      </motion.div>

      {/* Top bar — airline lockup · terminal + clock */}
      <motion.header
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="relative z-10 w-full max-w-6xl mx-auto px-5 sm:px-6 pt-6 sm:pt-7 flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          <svg width="22" height="22" viewBox="0 0 64 64" fill="none">
            <path
              d="M56 28L36 32L28 52L22 50L28 32L8 36L4 32L8 28L28 22L22 4L28 2L36 22L56 26L60 28L56 28Z"
              fill="#f0c040"
            />
          </svg>
          <span className="font-serif text-2xl text-muted-white leading-none">
            Focus<span className="text-gold">Flight</span><span className="text-muted-white/35">.io</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:block font-mono text-xs tracking-[0.2em] uppercase text-muted-white/30">
            Terminal 1
          </span>
          <Clock />
        </div>
      </motion.header>

      {/* Main split */}
      <div className="relative z-10 flex-1 flex items-center w-full max-w-6xl mx-auto px-5 sm:px-6 py-10 pb-20 lg:py-12">
        <div className="grid lg:grid-cols-[10fr_11fr] gap-10 lg:gap-14 items-center w-full">

          {/* Left — headline + check-in */}
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="font-serif text-[2.1rem] sm:text-4xl md:text-5xl text-muted-white leading-[1.15] mb-5"
            >
              Your study session becomes <span className="text-gold">a flight.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="text-muted-white/50 text-base sm:text-lg mb-8 sm:mb-10 font-sans font-light tracking-wide"
            >
              Phone on airplane mode. Pick a real flight —
              land when the work is done.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.55 }}
            >
              <InputForm />
            </motion.div>
          </div>

          {/* Right — live worldwide board */}
          <motion.div
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            <DepartureBoard />
          </motion.div>

        </div>
      </div>

      {/* Scroll nudge — flight log lives below the fold */}
      <motion.button
        type="button"
        onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.6 }}
        className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5
        text-muted-white/30 hover:text-gold/70 transition-colors duration-200 cursor-pointer"
        aria-label="Scroll down to your flight log"
      >
        <span className="font-mono text-[0.65rem] tracking-[0.2em] uppercase">
          Flight log
        </span>
        <motion.svg
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </motion.button>

      {/* Bottom runway lights */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
    </div>

    <FlightHistorySection />
    <HowItWorks />
    </>
  );
};

export default Hero;
