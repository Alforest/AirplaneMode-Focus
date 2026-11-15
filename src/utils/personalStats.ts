import type { CompletedFlight } from '../types/history';

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
export function personalStats(flights: CompletedFlight[], now = new Date()) {
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 6) % 7);
  const days = new Set(flights.filter(f => Date.parse(f.date) <= now.getTime()).map(f => dayKey(new Date(f.date))));
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return {
    totalMinutes: flights.reduce((sum, f) => sum + f.durationMinutes, 0),
    weekMinutes: flights.filter(f => Date.parse(f.date) >= weekStart.getTime() && Date.parse(f.date) <= now.getTime()).reduce((sum, f) => sum + f.durationMinutes, 0),
    totalKm: Math.round(flights.reduce((sum, f) => sum + f.distanceKm, 0)),
    longestMinutes: flights.reduce((longest, f) => Math.max(longest, f.durationMinutes), 0),
    destinations: new Set(flights.map(f => f.destination.iata)).size,
    countries: new Set(flights.map(f => f.destination.country)).size,
    flightCount: flights.length,
    streak,
  };
}
export function personalTime(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
