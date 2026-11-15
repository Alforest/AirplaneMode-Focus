import type { CompletedFlight } from '../types/history';
import { personalStats, personalTime } from './personalStats';

export interface LandingReward { id: string; title: string; detail: string }
export function landingRewards(history: CompletedFlight[], flight: CompletedFlight, goal: number | null, now = new Date(flight.date)): LandingReward[] {
  // Exclude the just-saved session so StrictMode/remounts cannot inflate comparisons.
  const previous = history.filter(item => item.id !== flight.id);
  const before = personalStats(previous, now);
  const after = personalStats([...previous, flight], now);
  const rewards: LandingReward[] = [];
  if (goal && before.weekMinutes < goal && after.weekMinutes >= goal) rewards.push({
    id: 'weekly-goal', title: 'Weekly goal reached', detail: `${personalTime(after.weekMinutes)} of focus. You made time for what matters.`,
  });
  if (!previous.length) rewards.push({ id: 'first-flight', title: 'Your first flight, landed', detail: 'One session in the log. A whole journey ahead.' });
  if (previous.length && flight.durationMinutes > before.longestMinutes) rewards.push({
    id: 'longest-session', title: 'A new personal best', detail: `${personalTime(flight.durationMinutes)} — your longest study flight yet.`,
  });
  if (!previous.some(item => item.destination.country === flight.destination.country)) rewards.push({
    id: 'new-country', title: 'A new country in your log', detail: `${flight.destination.country}. Another corner of the world, explored through focus.`,
  });
  if (after.streak > before.streak && after.streak >= 2) rewards.push({
    id: 'streak', title: `${after.streak}-day study streak`, detail: 'Showing up again is something to celebrate.',
  });
  if (!rewards.length && !previous.some(item => item.destination.iata === flight.destination.iata)) rewards.push({
    id: 'new-destination', title: 'A new destination', detail: `${flight.destination.city} is now part of your story.`,
  });
  if (!rewards.length) rewards.push({ id: 'session', title: 'Time well spent', detail: `${personalTime(flight.durationMinutes)} set aside for yourself. Every flight counts.` });
  return rewards.slice(0, 3);
}
