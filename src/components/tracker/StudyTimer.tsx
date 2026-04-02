import React from 'react';
import { motion } from 'framer-motion';
import { useFlightProgress, getFlightStatus } from '../../hooks/useFlightProgress';

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const StudyTimer: React.FC = () => {
  const { progress, remainingSeconds } = useFlightProgress();
  const status = getFlightStatus(progress);

  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Circular progress ring */}
      <div className="relative w-40 h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          {/* Track */}
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke="rgba(240,192,64,0.08)"
            strokeWidth="4"
          />
          {/* Progress */}
          <motion.circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke="#f0c040"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: 'linear' }}
          />
        </svg>

        {/* Inner content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-muted-white/30 text-xs uppercase tracking-widest">
            Remaining
          </span>
          <span className="font-mono text-gold text-xl font-bold leading-tight mt-1">
            {formatCountdown(remainingSeconds)}
          </span>
        </div>
      </div>

      {/* Flight status */}
      <div className="text-center">
        <motion.div
          key={status}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-mono text-gold text-sm tracking-widest uppercase"
        >
          {status}
        </motion.div>
        <div className="font-sans text-muted-white/25 text-xs mt-1">
          {Math.round(progress * 100)}% complete
        </div>
      </div>
    </div>
  );
};

export default StudyTimer;
