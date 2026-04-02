import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CompletedFlight } from '../types/history';

interface HistoryState {
  flights: CompletedFlight[];
  addFlight: (flight: CompletedFlight) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      flights: [],
      addFlight: (flight) =>
        set((state) => ({ flights: [flight, ...state.flights] })),
      clearHistory: () => set({ flights: [] }),
    }),
    { name: 'airplane-mode-history' }
  )
);
