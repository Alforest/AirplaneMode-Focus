import React from 'react';
import { motion } from 'framer-motion';
import { Airport } from '../../data/airports';
import { FlightInfo } from '../../utils/generateFlightInfo';
import { formatDuration } from '../../utils/flightCalculations';

interface BoardingPassCardProps {
  departure: Airport;
  destination: Airport;
  flightInfo: FlightInfo;
  durationMinutes: number;
  index: number;
  onSelect: () => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// Simple SVG barcode
const Barcode: React.FC = () => (
  <svg width="120" height="36" viewBox="0 0 120 36" fill="none">
    {Array.from({ length: 40 }, (_, i) => {
      const x = i * 3;
      const h = 20 + Math.random() * 16;
      const w = Math.random() > 0.3 ? 1.5 : 1;
      return (
        <rect
          key={i}
          x={x}
          y={(36 - h) / 2}
          width={w}
          height={h}
          fill="rgba(240,192,64,0.5)"
        />
      );
    })}
  </svg>
);

const BoardingPassCard: React.FC<BoardingPassCardProps> = ({
  departure,
  destination,
  flightInfo,
  durationMinutes,
  index,
  onSelect,
}) => {
  const now = new Date();
  const arrival = new Date(now.getTime() + durationMinutes * 60 * 1000);
  const boardingTime = new Date(now.getTime() - 15 * 60 * 1000);

  const cardVariants = {
    hidden: { rotateY: 90, opacity: 0 },
    visible: {
      rotateY: 0,
      opacity: 1,
      transition: { duration: 0.6, delay: index * 0.15, ease: 'easeOut' },
    },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.03, y: -6 }}
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className="boarding-pass cursor-pointer group relative select-none"
      style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
    >
      {/* Main pass body */}
      <div className="boarding-pass-main relative overflow-hidden rounded-2xl rounded-b-none"
        style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1525 100%)' }}
      >
        {/* Gold glow border on hover */}
        <div className="absolute inset-0 rounded-2xl rounded-b-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ boxShadow: 'inset 0 0 0 1px rgba(240,192,64,0.5), 0 0 30px rgba(240,192,64,0.15)' }}
        />

        {/* Header strip */}
        <div className="px-6 pt-5 pb-4 border-b border-gold/10">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-xs text-muted-white/40 uppercase tracking-widest">
                {flightInfo.airline}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-gold text-sm font-bold tracking-wider">
                {flightInfo.flightNumber}
              </span>
              <div className="w-px h-4 bg-gold/20" />
              <span className="font-mono text-muted-white/40 text-xs">
                {flightInfo.aircraft}
              </span>
            </div>
          </div>
        </div>

        {/* Route */}
        <div className="px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            {/* Origin */}
            <div className="text-center flex-1">
              <div className="font-mono text-gold text-4xl font-bold tracking-wider leading-none">
                {departure.iata}
              </div>
              <div className="font-sans text-muted-white/50 text-xs mt-1 truncate">
                {departure.city}
              </div>
              <div className="font-mono text-muted-white/30 text-xs mt-1">
                {formatTime(now)}
              </div>
            </div>

            {/* Flight path line */}
            <div className="flex-1 flex items-center justify-center gap-1">
              <div className="flex-1 h-px bg-gradient-to-r from-gold/20 to-gold/60" />
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#f0c040" className="opacity-80 shrink-0">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
              </svg>
              <div className="flex-1 h-px bg-gradient-to-r from-gold/60 to-gold/20" />
            </div>

            {/* Destination */}
            <div className="text-center flex-1">
              <div className="font-mono text-gold text-4xl font-bold tracking-wider leading-none">
                {destination.iata}
              </div>
              <div className="font-sans text-muted-white/50 text-xs mt-1 truncate">
                {destination.city}
              </div>
              <div className="font-mono text-muted-white/30 text-xs mt-1">
                {formatTime(arrival)}
              </div>
            </div>
          </div>

          {/* Duration indicator */}
          <div className="text-center mt-3">
            <span className="font-mono text-muted-white/30 text-xs tracking-wider">
              {formatDuration(durationMinutes)} flight
            </span>
          </div>
        </div>

        {/* Info grid */}
        <div className="px-6 pb-5 grid grid-cols-4 gap-3 border-t border-gold/10 pt-4">
          <div>
            <div className="font-mono text-muted-white/30 text-xs uppercase tracking-widest mb-1">Class</div>
            <div className="font-mono text-muted-white/80 text-xs font-semibold truncate">
              {flightInfo.seatClass}
            </div>
          </div>
          <div>
            <div className="font-mono text-muted-white/30 text-xs uppercase tracking-widest mb-1">Seat</div>
            <div className="font-mono text-gold text-sm font-bold">{flightInfo.seat}</div>
          </div>
          <div>
            <div className="font-mono text-muted-white/30 text-xs uppercase tracking-widest mb-1">Gate</div>
            <div className="font-mono text-muted-white/80 text-sm font-bold">{flightInfo.gate}</div>
          </div>
          <div>
            <div className="font-mono text-muted-white/30 text-xs uppercase tracking-widest mb-1">Board</div>
            <div className="font-mono text-muted-white/80 text-xs font-semibold">
              {formatTime(boardingTime)}
            </div>
          </div>
        </div>

        {/* Passenger name */}
        <div className="px-6 pb-5">
          <div className="font-mono text-muted-white/20 text-xs uppercase tracking-widest mb-1">Passenger</div>
          <div className="font-sans text-muted-white/60 text-sm tracking-wide">
            {flightInfo.passengerName}
          </div>
        </div>
      </div>

      {/* Perforated tear line */}
      <div className="relative h-6 overflow-hidden" style={{ background: '#0d1b2a' }}>
        <div className="absolute inset-x-0 top-0 flex items-center">
          {/* Left semicircle notch */}
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full"
            style={{ background: '#0a0e1a' }} />
          {/* Right semicircle notch */}
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full"
            style={{ background: '#0a0e1a' }} />
          {/* Dashed line */}
          <div className="w-full border-t-2 border-dashed border-gold/15 mx-3" />
        </div>
      </div>

      {/* Stub */}
      <div className="rounded-b-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1525 100%)' }}
      >
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <div className="font-mono text-muted-white/25 text-xs uppercase tracking-widest">
              Terminal {flightInfo.terminal}
            </div>
            <div className="font-mono text-gold/60 text-lg font-bold mt-0.5">
              {departure.iata} → {destination.iata}
            </div>
          </div>
          <Barcode />
        </div>
      </div>

      {/* Select prompt */}
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        className="absolute inset-0 flex items-center justify-center rounded-2xl"
        style={{ background: 'rgba(240,192,64,0.05)' }}
      >
        <div className="bg-gold text-navy font-mono font-bold px-6 py-2 rounded-full text-sm tracking-widest uppercase">
          Select This Flight
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BoardingPassCard;
