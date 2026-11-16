import type { Airport } from '../data/airports';
import type { FlightInfo } from '../utils/generateFlightInfo';

export interface ActiveFlight {
  version: 1;
  owner: string;
  sessionId: string;
  departure: Airport;
  destination: Airport;
  durationMinutes: number;
  startTime: number;
  speedMultiplier: number;
  flightInfo: FlightInfo;
  phase: 'tracker' | 'landed';
  completedAt: number | null;
  challengeEligible: boolean;
}
const key = (owner: string) => `focusflight-active-flight-v1:${owner}`;
const validAirport = (value: unknown): value is Airport => {
  const item = value as Airport | null;
  return !!item && /^[A-Z]{3}$/.test(item.iata) && typeof item.city === 'string' && typeof item.country === 'string' && Number.isFinite(item.lat) && Math.abs(item.lat) <= 90 && Number.isFinite(item.lon) && Math.abs(item.lon) <= 180;
};
export function parseActiveFlight(value: unknown, owner: string): ActiveFlight | null {
  const item = value as ActiveFlight | null;
  if (!item || item.version !== 1 || item.owner !== owner || !/^[0-9a-f-]{36}$/i.test(item.sessionId)
    || !validAirport(item.departure) || !validAirport(item.destination)
    || !Number.isInteger(item.durationMinutes) || item.durationMinutes < 1 || item.durationMinutes > 2880
    || !Number.isFinite(item.startTime) || item.startTime <= 0 || ![1, 10, 60, 300].includes(item.speedMultiplier)
    || (item.phase === 'landed' && item.completedAt === null)
    || !['tracker', 'landed'].includes(item.phase) || typeof item.challengeEligible !== 'boolean'
    || (item.completedAt !== null && (!Number.isFinite(item.completedAt) || item.completedAt < item.startTime))
    || !item.flightInfo || !['airline', 'flightNumber', 'aircraft', 'seat', 'gate', 'seatClass', 'passengerName', 'terminal'].every(field => typeof item.flightInfo[field as keyof FlightInfo] === 'string')) return null;
  return item;
}
export function readActiveFlight(owner: string): ActiveFlight | null {
  try { return parseActiveFlight(JSON.parse(localStorage.getItem(key(owner)) ?? 'null'), owner); } catch { return null; }
}
export function saveActiveFlight(flight: ActiveFlight): boolean {
  const current = readActiveFlight(flight.owner);
  if (current && current.sessionId !== flight.sessionId && current.startTime > flight.startTime) return false;
  try { localStorage.setItem(key(flight.owner), JSON.stringify(flight)); return true; } catch { return false; }
}
export function clearActiveFlight(owner: string, sessionId: string): void {
  if (readActiveFlight(owner)?.sessionId !== sessionId) return;
  try { localStorage.removeItem(key(owner)); } catch { /* No persisted recovery record. */ }
}
export function markActiveChallenge(owner: string, sessionId: string): void {
  const flight = readActiveFlight(owner);
  if (flight?.sessionId === sessionId) saveActiveFlight({ ...flight, challengeEligible: true });
}
export function flightElapsed(startTime: number, minutes: number, multiplier = 1, now = Date.now()) {
  const total = minutes * 60_000;
  const elapsed = Math.min(total, Math.max(0, (now - startTime) * multiplier));
  return { elapsed, remaining: total - elapsed, progress: elapsed / total };
}
