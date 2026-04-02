import { useEffect, useRef, useState } from 'react';
import { useFlightStore } from '../store/flightStore';

interface FlightProgress {
  progress: number;       // 0–1
  elapsed: number;        // ms elapsed
  remaining: number;      // ms remaining
  elapsedSeconds: number;
  remainingSeconds: number;
}

export function useFlightProgress(): FlightProgress {
  const { startTime, durationMinutes, landFlight, phase, speedMultiplier } = useFlightStore();
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const hasLanded = useRef(false);

  useEffect(() => {
    if (phase !== 'tracker' || startTime === null) return;

    hasLanded.current = false;

    const totalMs = durationMinutes * 60 * 1000;

    const tick = () => {
      const elapsed = (Date.now() - startTime) * useFlightStore.getState().speedMultiplier;
      const p = Math.min(elapsed / totalMs, 1);
      setProgress(p);

      if (p >= 1 && !hasLanded.current) {
        hasLanded.current = true;
        landFlight();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [startTime, durationMinutes, phase, landFlight]);

  const totalMs = durationMinutes * 60 * 1000;
  const elapsed = startTime ? Math.min((Date.now() - startTime) * speedMultiplier, totalMs) : 0;
  const remaining = Math.max(totalMs - elapsed, 0);

  return {
    progress,
    elapsed,
    remaining,
    elapsedSeconds: Math.floor(elapsed / 1000),
    remainingSeconds: Math.floor(remaining / 1000),
  };
}

export function getFlightStatus(progress: number): string {
  if (progress < 0.20) return 'Ascending';
  if (progress < 0.80) return 'Cruising';
  if (progress < 0.95) return 'Descending';
  return 'Landed!';
}

export function getSimulatedStats(progress: number, totalDistKm: number) {
  const curve = Math.sin(Math.PI * progress);
  return {
    altitudeFt: Math.round(35000 * curve),
    speedMph: Math.round(575 * curve),
    distRemainingKm: Math.round(totalDistKm * (1 - progress)),
  };
}
