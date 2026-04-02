import React, { useEffect, useRef, useState } from 'react';
import { useFlightProgress, getSimulatedStats } from '../../hooks/useFlightProgress';
import { useFlightStore } from '../../store/flightStore';
import { haversineKm } from '../../utils/flightCalculations';

const StatItem: React.FC<{ label: string; value: string; unit: string }> = ({ label, value, unit }) => (
  <div className="text-center">
    <div className="font-mono text-muted-white/30 text-xs uppercase tracking-widest mb-1">{label}</div>
    <div className="flex items-baseline gap-1 justify-center">
      <span className="font-mono text-muted-white text-lg font-bold tabular-nums">
        {value}
      </span>
      <span className="font-mono text-muted-white/40 text-xs">{unit}</span>
    </div>
  </div>
);

const FlightStats: React.FC = () => {
  const { departure, destination } = useFlightStore();
  const { progress } = useFlightProgress();

  const totalDistKm =
    departure && destination
      ? haversineKm(departure.lat, departure.lon, destination.lat, destination.lon)
      : 0;

  // Throttle display to once per second to prevent flashing
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const [displayedStats, setDisplayedStats] = useState(() =>
    getSimulatedStats(progress, totalDistKm)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayedStats(getSimulatedStats(progressRef.current, totalDistKm));
    }, 1000);
    return () => clearInterval(interval);
  }, [totalDistKm]);

  const { altitudeFt, speedMph, distRemainingKm } = displayedStats;

  return (
    <div className="glass-card rounded-2xl px-4 py-4 grid grid-cols-3 gap-2 divide-x divide-gold/10">
      <StatItem label="Altitude" value={altitudeFt.toLocaleString()} unit="ft" />
      <StatItem label="Speed"    value={speedMph.toLocaleString()}    unit="mph" />
      <StatItem label="Remaining" value={distRemainingKm.toLocaleString()} unit="km" />
    </div>
  );
};

export default FlightStats;
