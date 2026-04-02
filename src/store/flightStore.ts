import { create } from 'zustand';
import { Airport } from '../data/airports';
import { FlightInfo } from '../utils/generateFlightInfo';

export type Phase = 'landing' | 'boarding' | 'tracker' | 'landed';

interface FlightState {
  phase: Phase;
  departure: Airport | null;
  generatedDestinations: Airport[];
  destination: Airport | null;
  durationMinutes: number;
  startTime: number | null;
  flightInfo: FlightInfo | null;
  speedMultiplier: number;

  setPhase: (phase: Phase) => void;
  setDeparture: (airport: Airport) => void;
  setGeneratedDestinations: (airports: Airport[]) => void;
  selectDestination: (airport: Airport, flightInfo: FlightInfo) => void;
  startFlight: () => void;
  landFlight: () => void;
  setDuration: (minutes: number) => void;
  setSpeedMultiplier: (multiplier: number) => void;
  reset: () => void;
}

export const useFlightStore = create<FlightState>((set) => ({
  phase: 'landing',
  departure: null,
  generatedDestinations: [],
  destination: null,
  durationMinutes: 120,
  startTime: null,
  flightInfo: null,
  speedMultiplier: 1,

  setPhase: (phase) => set({ phase }),
  setDeparture: (airport) => set({ departure: airport }),
  setGeneratedDestinations: (airports) => set({ generatedDestinations: airports }),
  selectDestination: (airport, flightInfo) =>
    set({ destination: airport, flightInfo }),
  startFlight: () => set({ startTime: Date.now(), phase: 'tracker' }),
  landFlight: () => set({ phase: 'landed' }),
  setDuration: (minutes) => set({ durationMinutes: minutes }),
  setSpeedMultiplier: (multiplier) => set({ speedMultiplier: multiplier }),
  reset: () =>
    set({
      phase: 'landing',
      departure: null,
      generatedDestinations: [],
      destination: null,
      durationMinutes: 120,
      startTime: null,
      flightInfo: null,
      speedMultiplier: 1,
    }),
}));
