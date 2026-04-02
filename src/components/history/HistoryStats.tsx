import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useHistoryStore } from '../../store/historyStore';
import { formatDuration } from '../../utils/flightCalculations';

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  index: number;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: index * 0.08 }}
    className="glass-card rounded-2xl p-5 flex flex-col gap-2"
  >
    <div className="flex items-center justify-between">
      <span className="font-mono text-muted-white/30 text-xs uppercase tracking-widest">{label}</span>
      <span className="text-gold/30">{icon}</span>
    </div>
    <div className="font-mono text-gold font-bold text-3xl leading-none tabular-nums">
      {value}
    </div>
  </motion.div>
);

const HistoryStats: React.FC = () => {
  const flights = useHistoryStore(s => s.flights);

  const stats = useMemo(() => {
    if (!flights.length) return null;

    const totalMinutes = flights.reduce((sum, f) => sum + f.durationMinutes, 0);
    const totalKm = flights.reduce((sum, f) => sum + f.distanceKm, 0);
    const countries = new Set(flights.map(f => f.destination.country)).size;
    const airports = new Set([
      ...flights.map(f => f.departure.iata),
      ...flights.map(f => f.destination.iata),
    ]).size;

    // Format total study time
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const timeStr = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;

    return { totalMinutes, totalKm, countries, airports, timeStr };
  }, [flights]);

  if (!flights.length) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="font-mono text-muted-white/20 text-xs uppercase tracking-widest mb-2">
          Flight Stats
        </div>
        <p className="font-sans text-muted-white/30 text-sm">
          Complete your first flight to see your stats.
        </p>
      </div>
    );
  }

  const cards = [
    {
      label: 'Flights Taken',
      value: flights.length.toString(),
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>
      ),
    },
    {
      label: 'Hours Studied',
      value: stats!.timeStr,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
    },
    {
      label: 'Km Traveled',
      value: Math.round(stats!.totalKm).toLocaleString(),
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      ),
    },
    {
      label: 'Countries',
      value: stats!.countries.toString(),
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card, i) => (
        <StatCard key={card.label} {...card} index={i} />
      ))}
    </div>
  );
};

export default HistoryStats;
