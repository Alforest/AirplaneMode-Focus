import React from 'react';
import { motion } from 'framer-motion';
import CloudBackground from '../shared/CloudBackground';
import InputForm from './InputForm';
import DepartureBoard from './DepartureBoard';
import FlightHistorySection from '../history/FlightHistorySection';

const Hero: React.FC = () => {
  return (
    <>
    <div className="relative min-h-screen bg-navy overflow-hidden flex flex-col items-center justify-center">
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

      {/* Main content */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-6 text-center">
        {/* Logo / Brand */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-2 flex items-center justify-center gap-3"
        >
          <div className="w-px h-8 bg-gold/40" />
          <span className="font-mono text-gold/60 text-sm tracking-widest uppercase">
            Boarding Now
          </span>
          <div className="w-px h-8 bg-gold/40" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="font-display text-5xl md:text-7xl text-muted-white mb-4 leading-tight"
        >
          AirplaneMode
          <br />
          <span className="text-gold">Focus</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-muted-white/60 text-lg mb-12 font-sans font-light tracking-wide"
        >
          Put your phone on airplane mode.
          <br />
          <em className="text-muted-white/40">Your study session becomes a flight.</em>
        </motion.p>

        {/* Input form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <InputForm />
        </motion.div>
      </div>

      {/* Bottom runway lights */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
    </div>

    <DepartureBoard />
    <FlightHistorySection />
    </>
  );
};

export default Hero;
