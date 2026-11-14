import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CompletedFlight } from '../types/history';

export interface HistoryRecord {
  flight: CompletedFlight;
  deleted: boolean;
  pending: boolean;
  revision: string;
}
type Bucket = Record<string, HistoryRecord>;
const GUEST = 'guest';
const visible = (bucket: Bucket = {}) => Object.values(bucket)
  .filter(r => !r.deleted).map(r => r.flight)
  .sort((a, b) => b.date.localeCompare(a.date));

interface HistoryState {
  owner: string;
  buckets: Record<string, Bucket>;
  flights: CompletedFlight[];
  setOwner: (owner: string | null) => void;
  addFlight: (flight: CompletedFlight) => void;
  clearHistory: () => void;
  importGuest: () => void;
  mergeCloud: (owner: string, records: HistoryRecord[]) => void;
  acknowledge: (owner: string, records: HistoryRecord[]) => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      owner: GUEST,
      buckets: {},
      flights: [],
      setOwner: (owner) => set(state => {
        const key = owner ?? GUEST;
        return { owner: key, flights: visible(state.buckets[key]) };
      }),
      addFlight: (flight) => set(state => {
        const bucket = { ...state.buckets[state.owner] };
        if (bucket[flight.id]) return state;
        bucket[flight.id] = { flight, deleted: false, pending: true, revision: crypto.randomUUID() };
        return { buckets: { ...state.buckets, [state.owner]: bucket }, flights: visible(bucket) };
      }),
      clearHistory: () => set(state => {
        const bucket = { ...state.buckets[state.owner] };
        for (const [id, record] of Object.entries(bucket)) {
          if (!record.deleted) bucket[id] = { ...record, deleted: true, pending: true, revision: crypto.randomUUID() };
        }
        return { buckets: { ...state.buckets, [state.owner]: bucket }, flights: [] };
      }),
      importGuest: () => set(state => {
        if (state.owner === GUEST) return state;
        const bucket = { ...state.buckets[state.owner] };
        for (const record of Object.values(state.buckets[GUEST] ?? {})) {
          if (!record.deleted && !bucket[record.flight.id]) {
            bucket[record.flight.id] = { ...record, pending: true, revision: crypto.randomUUID() };
          }
        }
        // Move rather than copy: these flights won't be offered to a second account.
        return { buckets: { ...state.buckets, [GUEST]: {}, [state.owner]: bucket }, flights: visible(bucket) };
      }),
      mergeCloud: (owner, records) => set(state => {
        const bucket = { ...state.buckets[owner] };
        for (const record of records) {
          const local = bucket[record.flight.id];
          // Deletion always wins. An offline device cannot resurrect cleared flights.
          if (record.deleted || !local?.pending) bucket[record.flight.id] = record;
        }
        return {
          buckets: { ...state.buckets, [owner]: bucket },
          ...(state.owner === owner ? { flights: visible(bucket) } : {}),
        };
      }),
      acknowledge: (owner, records) => set(state => {
        const bucket = { ...state.buckets[owner] };
        for (const record of records) {
          if (bucket[record.flight.id]?.revision === record.revision) {
            bucket[record.flight.id] = { ...record, pending: false };
          }
        }
        return { buckets: { ...state.buckets, [owner]: bucket } };
      }),
    }),
    {
      name: 'airplane-mode-history',
      version: 1,
      // Account identity is established by Auth each load, never by persisted UI state.
      partialize: state => ({ buckets: state.buckets }),
      migrate: (persisted) => {
        const old = persisted as { flights?: CompletedFlight[] };
        const guest: Bucket = {};
        for (const flight of old.flights ?? []) {
          guest[flight.id] = { flight, deleted: false, pending: true, revision: crypto.randomUUID() };
        }
        return { buckets: { [GUEST]: guest } };
      },
      merge: (persisted, current) => {
        const saved = persisted as { buckets?: Record<string, Bucket> };
        const buckets = saved.buckets ?? {};
        return { ...current, buckets, flights: visible(buckets[current.owner]) };
      },
    }
  )
);
