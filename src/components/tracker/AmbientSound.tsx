import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

// Freely licensed cabin ambient audio (white noise / engine hum approximation)
// Using a public domain audio URL — can be replaced with a local file
const AMBIENT_AUDIO_URL = 'https://www.soundjay.com/nature/sounds/wind-1.mp3';

const AmbientSound: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      try {
        audio.volume = 0.35;
        await audio.play();
        setIsPlaying(true);
      } catch (_) {
        // Autoplay blocked or audio unavailable
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <>
      <audio ref={audioRef} loop src={AMBIENT_AUDIO_URL} preload="none" />
      <motion.button
        onClick={toggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs tracking-widest uppercase transition-all duration-200 ${
          isPlaying
            ? 'bg-gold/20 text-gold border border-gold/40'
            : 'bg-midnight/60 text-muted-white/40 border border-gold/10 hover:border-gold/30 hover:text-muted-white/60'
        }`}
      >
        {isLoading ? (
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/>
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
          </svg>
        ) : isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        )}
        {isLoading ? 'Loading...' : isPlaying ? 'Sound On' : 'Ambient'}
      </motion.button>
    </>
  );
};

export default AmbientSound;
