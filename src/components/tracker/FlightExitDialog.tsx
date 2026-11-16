import { useEffect, useRef } from 'react';
import { useFlightStore } from '../../store/flightStore';
import { flightElapsed } from '../../lib/activeFlight';
import { formatDuration } from '../../utils/flightCalculations';

export default function FlightExitDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { startTime, durationMinutes, speedMultiplier, suspendFlight, reset, recoveryAvailable, phase } = useFlightStore();
  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    return () => { document.body.style.overflow = overflow; element.close(); if (previous?.isConnected) previous.focus(); };
  }, [open]);
  useEffect(() => { if (phase !== 'tracker') onClose(); }, [phase, onClose]);
  if (!open) return null;
  const elapsed = startTime ? Math.floor(flightElapsed(startTime, durationMinutes, speedMultiplier).elapsed / 60000) : 0;
  return <dialog ref={dialog} aria-labelledby="flight-exit-title" onCancel={onClose} onClose={onClose}
    className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-gold/25 bg-midnight p-6 text-muted-white shadow-2xl backdrop:bg-navy/80">
    <p className="font-mono text-xs uppercase tracking-widest text-gold/60">Your flight is still in progress</p>
    <h2 id="flight-exit-title" className="mt-3 font-serif text-2xl text-gold">Head back to the terminal?</h2>
    <p className="mt-3 text-sm leading-relaxed text-muted-white/70">You’ve been studying for {formatDuration(elapsed)}. Save your flight to return later, or end it without adding this session to your log or challenge total.</p>
    <p className="mt-3 text-xs leading-relaxed text-muted-white/50">A saved flight keeps its timer running, even while you’re away. Recovery is on this device only.</p>
    {!recoveryAvailable && <p role="alert" className="mt-3 text-sm text-red-300">This browser couldn’t save recovery data. Keep this page open to finish your flight.</p>}
    <div className="mt-6 flex flex-col gap-3">
      <button type="button" autoFocus onClick={onClose} className="rounded-lg bg-gold px-4 py-3 font-semibold text-navy hover:bg-amber focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">Keep studying</button>
      <button type="button" disabled={!recoveryAvailable} onClick={() => { suspendFlight(); onClose(); }} className="rounded-lg border border-gold/25 px-4 py-3 text-gold hover:bg-gold/10 disabled:opacity-40">Save & return to terminal</button>
      <button type="button" onClick={() => { reset(); onClose(); }} className="px-4 py-2 text-sm text-muted-white/60 underline underline-offset-4 hover:text-red-300">End flight without logging</button>
    </div>
  </dialog>;
}
