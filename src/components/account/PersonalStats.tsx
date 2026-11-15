import { useMemo } from 'react';
import { useHistoryStore } from '../../store/historyStore';
import { personalStats, personalTime } from '../../utils/personalStats';

export default function PersonalStats() {
  const flights = useHistoryStore(state => state.flights);
  const stats = useMemo(() => personalStats(flights), [flights]);
  const cards = [
    ['Total study time', personalTime(stats.totalMinutes)],
    ['This week', personalTime(stats.weekMinutes)],
    ['Flights landed', String(stats.flightCount)],
    ['Current streak', `${stats.streak} ${stats.streak === 1 ? 'day' : 'days'}`],
    ['Longest session', personalTime(stats.longestMinutes)],
    ['Destinations', String(stats.destinations)],
  ];
  return <section aria-label="Your study stats">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{cards.map(([label, value]) => <div key={label} className="rounded-xl border border-gold/10 bg-navy/60 p-4">
      <p className="text-xs text-muted-white/60">{label}</p>
      <p className="mt-2 font-mono text-xl text-gold tabular-nums">{value}</p>
    </div>)}</div>
    <p className="mt-3 text-xs leading-relaxed text-muted-white/50">Based on your completed flight log, including imported flights. Weeks start Monday in your local time. Study today to keep your streak going.</p>
  </section>;
}
