import { create } from 'zustand';
import { Airport } from '../data/airports';
import { FlightInfo, buildFlightInfo } from '../utils/generateFlightInfo';
import { BoardFlight } from '../utils/departureBoard';
import { track } from '../lib/analytics';

export type Phase = 'landing' | 'departures' | 'boarding' | 'tracker' | 'landed';

interface FlightState {
  phase: Phase;
  departure: Airport | null;
  destination: Airport | null;
  boardFlight: BoardFlight | null;
  durationMinutes: number;
  startTime: number | null;
  flightInfo: FlightInfo | null;
  speedMultiplier: number;

  setPhase: (phase: Phase) => void;
  setDeparture: (airport: Airport) => void;
  /** Pick a flight off the departure board → boarding pass confirmation */
  selectFlight: (departure: Airport, flight: BoardFlight) => void;
  startFlight: () => void;
  landFlight: () => void;
  setSpeedMultiplier: (multiplier: number) => void;
  reset: () => void;
}

export const useFlightStore = create<FlightState>((set, get) => ({
  phase: 'landing',
  departure: null,
  destination: null,
  boardFlight: null,
  durationMinutes: 120,
  startTime: null,
  flightInfo: null,
  speedMultiplier: 1,

  setPhase: (phase) => set({ phase }),
  setDeparture: (airport) => {
    track('departures_viewed', { airport: airport.iata });
    set({ departure: airport, phase: 'departures' });
  },
  selectFlight: (departure, flight) => {
    track('flight_selected', {
      departure: departure.iata,
      destination: flight.destination.iata,
      duration_minutes: flight.durationMinutes,
      airline: flight.airline,
      is_real_route: flight.isReal,
    });
    set({
      departure,
      boardFlight: flight,
      destination: flight.destination,
      durationMinutes: flight.durationMinutes,
      flightInfo: buildFlightInfo(flight.airline, flight.airlineCode, flight.aircraft, flight.flightNumber.replace(' ', '')),
      phase: 'boarding',
    });
  },
  startFlight: () => {
    const { departure, destination, durationMinutes } = get();
    track('flight_started', {
      departure: departure?.iata,
      destination: destination?.iata,
      duration_minutes: durationMinutes,
    });
    set({ startTime: Date.now(), phase: 'tracker' });
  },
  landFlight: () => {
    const { departure, destination, durationMinutes } = get();
    track('flight_completed', {
      departure: departure?.iata,
      destination: destination?.iata,
      duration_minutes: durationMinutes,
    });
    set({ phase: 'landed' });
  },
  setSpeedMultiplier: (multiplier) => set({ speedMultiplier: multiplier }),
  reset: () => {
    const { phase, departure, destination, durationMinutes, startTime } = get();
    if (phase === 'tracker' && startTime) {
      track('flight_abandoned', {
        departure: departure?.iata,
        destination: destination?.iata,
        duration_minutes: durationMinutes,
        elapsed_minutes: Math.round((Date.now() - startTime) / 60000),
        via: 'reset',
      });
    }
    set({
      phase: 'landing',
      departure: null,
      destination: null,
      boardFlight: null,
      durationMinutes: 120,
      startTime: null,
      flightInfo: null,
      speedMultiplier: 1,
    });
  },
}));
