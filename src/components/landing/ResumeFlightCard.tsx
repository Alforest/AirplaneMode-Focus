import { useEffect, useState } from 'react';
import { useFlightStore } from '../../store/flightStore';
import { flightElapsed } from '../../lib/activeFlight';
import { formatDuration } from '../../utils/flightCalculations';

export default function ResumeFlightCard() {
  const { savedFlight, resumeSavedFlight, discardSavedFlight } = useFlightStore();
  const [now, setNow] = useState(Date.now);
  const [confirmEnd, setConfirmEnd] = useState(false);
  useEffect(() => {
    if (!savedFlight) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [savedFlight?.sessionId]);
  if (!savedFlight) return null;
  const { remaining } = flightElapsed(savedFlight.startTime, savedFlight.durationMinutes, savedFlight.speedMultiplier, now);
  const arrived = savedFlight.phase === 'landed' || remaining === 0;
  return <aside aria-label="Saved flight" className="mb-5 rounded-xl border border-gold/30 bg-midnight/90 p-4">
    <p className="font-mono text-xs uppercase tracking-widest text-gold/60">{arrived ? 'Your arrival is waiting' : 'Your flight is still in the air'}</p>
    <h2 className="mt-2 font-serif text-xl text-gold">{savedFlight.departure.iata} → {savedFlight.destination.iata} · {savedFlight.destination.city}</h2>
    <p className="mt-2 text-sm text-muted-white/70">{arrived ? 'The timer finished while you were away. Open your arrival to log the completed flight.' : `${formatDuration(Math.ceil(remaining / 60000))} remaining. Your timer kept running while you were away.`}</p>
    <div className="mt-4 flex flex-wrap items-center gap-4">
      <button type="button" onClick={resumeSavedFlight} className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-navy hover:bg-amber focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">{arrived ? 'View arrival' : 'Resume flight'}</button>
      <button type="button" onClick={() => setConfirmEnd(true)} className="text-xs text-muted-white/60 underline underline-offset-4">{savedFlight.phase === 'landed' ? 'Dismiss saved arrival' : 'End saved flight'}</button>
    </div>
    {confirmEnd && <div className="mt-4 border-t border-gold/15 pt-3">
      <p className="text-sm text-muted-white/70">{savedFlight.phase === 'landed' ? 'Dismiss this saved arrival? Any history or challenge credit already recorded will stay.' : 'End this flight without logging or challenge credit?'}</p>
      <div className="mt-3 flex gap-4"><button type="button" onClick={() => { discardSavedFlight(); setConfirmEnd(false); }} className="text-sm text-red-300 underline">{savedFlight.phase === 'landed' ? 'Dismiss arrival' : 'Yes, end flight'}</button><button type="button" onClick={() => setConfirmEnd(false)} className="text-sm text-gold underline">Keep saved flight</button></div>
    </div>}
  </aside>;
}
