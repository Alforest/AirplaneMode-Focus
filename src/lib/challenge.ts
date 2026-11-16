import { create } from 'zustand';
import { supabase } from './supabase';
import { useAuthStore } from '../store/authStore';

export const CHALLENGE_START = Date.parse('2026-11-14T00:00:00-05:00');
export const CHALLENGE_END = Date.parse('2026-11-26T00:00:00-05:00');
export type ChallengePhase = 'upcoming' | 'active' | 'ended';
export const challengePhase = (now: number): ChallengePhase => now < CHALLENGE_START ? 'upcoming' : now < CHALLENGE_END ? 'active' : 'ended';
export const studyTime = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
export interface ChallengeEntry { nickname: string; minutes: number; position: number; is_you?: boolean }
export interface ChallengeBoard {
  starts_at: string; ends_at: string; server_now: string;
  entries: ChallengeEntry[]; participant_count: number; me: ChallengeEntry | null;
}

export const useChallengeFlight = create<{ id: string | null; message: string; status: 'idle' | 'pending' | 'eligible' | 'saved' | 'error' }>(() => ({ id: null, message: '', status: 'idle' }));

type Registration = { owner: string; ready: Promise<boolean> };
const registrations = new Map<string, Registration>();
// Starts are serialized so a slower request cannot replace a newer flight.
let startQueue: Promise<unknown> = Promise.resolve();
export function registerChallengeFlight(id: string, minutes: number, onRegistered?: () => void): void {
  const owner = useAuthStore.getState().user?.id;
  if (!supabase || !owner || challengePhase(Date.now()) !== 'active') return;
  const client = supabase;
  useChallengeFlight.setState({ id, status: 'pending', message: 'Checking challenge eligibility…' });
  const ready = startQueue.then(async () => {
    if (useAuthStore.getState().user?.id !== owner) return false;
    await retryChallengeCompletions();
    if ((readPending()[owner] ?? []).length > 0) {
      if (useChallengeFlight.getState().id === id) useChallengeFlight.setState({ status: 'error', message: 'Your previous challenge flight is still syncing. This flight will save to your private log only.' });
      return false;
    }
    try {
      const { error } = await client.rpc('start_challenge_flight', { p_id: id, p_minutes: minutes });
      if (registrations.has(id) && useChallengeFlight.getState().id === id) useChallengeFlight.setState({
        status: error ? 'error' : 'eligible',
        message: error ? 'Not counting toward the challenge. Join before takeoff, and connect online. Flights must finish before the deadline.' : 'Challenge flight registered. Stay signed in and connect at landing to count your time.',
      });
      if (!error && registrations.has(id)) onRegistered?.();
      return !error;
    } catch {
      if (useChallengeFlight.getState().id === id) useChallengeFlight.setState({ status: 'error', message: 'Challenge registration unavailable. This flight will still save to your flight log.' });
      return false;
    }
  });
  registrations.set(id, { owner, ready });
  startQueue = ready;
}

// Completion retries survive reloads, but are always scoped to their account.
const pendingKey = 'focusflight-challenge-completions';
let memoryPending: Record<string, string[]> = {};
function readPending(): Record<string, string[]> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(pendingKey) ?? '{}');
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      memoryPending = Object.fromEntries(Object.entries(value).filter(([, ids]) =>
        Array.isArray(ids) && ids.every(id => typeof id === 'string')
      ));
    }
  } catch { /* Retain in-memory retries when storage is unavailable. */ }
  return memoryPending;
}
function writePending(value: Record<string, string[]>) {
  memoryPending = value;
  try { localStorage.setItem(pendingKey, JSON.stringify(value)); } catch { /* Keep in memory. */ }
}
let finishing: Promise<void> | null = null;
export function retryChallengeCompletions(): Promise<void> {
  if (finishing) return finishing;
  finishing = (async () => {
    const client = supabase;
    const owner = useAuthStore.getState().user?.id;
    if (!client || !owner) return;
    for (const id of readPending()[owner] ?? []) {
      if (useAuthStore.getState().user?.id !== owner) break;
      try {
        const { error } = await client.rpc('finish_challenge_flight', { p_id: id });
        const rejected = error?.code === 'P0001' && error.message !== 'Flight has not finished yet.';
        if (!error || rejected) {
          if (useChallengeFlight.getState().id === id) useChallengeFlight.setState({ status: error ? 'error' : 'saved', message: error ? 'This flight was not eligible for challenge time. Your private flight log is unaffected.' : 'Study time added to your challenge total.' });
          const pending = readPending();
          pending[owner] = (pending[owner] ?? []).filter(item => item !== id);
          writePending(pending);
        }
      } catch { /* Retry on focus, reconnection, or the next tick. */ }
    }
  })().finally(() => { finishing = null; });
  return finishing;
}
export async function completeChallengeFlight(id: string): Promise<void> {
  const registration = registrations.get(id);
  if (!registration) return;
  const eligible = await registration.ready;
  registrations.delete(id);
  if (!eligible || useAuthStore.getState().user?.id !== registration.owner) return;
  const pending = readPending();
  pending[registration.owner] = [...new Set([...(pending[registration.owner] ?? []), id])];
  writePending(pending);
  if (useChallengeFlight.getState().id === id) useChallengeFlight.setState({ status: 'pending', message: 'Saving challenge time… If offline, reconnect before the deadline to count this flight.' });
  await retryChallengeCompletions();
}

export function invalidateChallengeFlight(id: string) {
  registrations.delete(id);
  if (useChallengeFlight.getState().id === id) useChallengeFlight.setState({ status: 'error', message: 'Accelerated flights do not count toward the challenge.' });
}

export function forgetChallengeFlight(id: string) { registrations.delete(id); }


export function restoreChallengeFlight(id: string, owner: string, eligible: boolean): void {
  if (registrations.has(id)) return;
  if (eligible && useAuthStore.getState().user?.id === owner) {
    registrations.set(id, { owner, ready: Promise.resolve(true) });
    useChallengeFlight.setState({ id, status: 'eligible', message: 'Challenge flight restored. Your original server start still applies; connect at landing before the deadline.' });
  } else {
    useChallengeFlight.setState({ id, status: 'idle', message: 'Flight restored to your private log. No confirmed challenge registration was saved for this flight.' });
  }
}
