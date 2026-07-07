import { create } from 'zustand';
import { Airport } from '../data/airports';
import { FlightInfo, buildFlightInfo } from '../utils/generateFlightInfo';
import { BoardFlight } from '../utils/departureBoard';
import { track, routeProps } from '../lib/analytics';

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
  /** Dev-only: hides all dev chrome (toolbar, ad placeholder) for clean screen recordings */
  devChromeHidden: boolean;

  setPhase: (phase: Phase) => void;
  setDeparture: (airport: Airport) => void;
  /** Pick a flight off a departure board → boarding pass confirmation */
  selectFlight: (departure: Airport, flight: BoardFlight, source?: 'departures_board' | 'landing_board') => void;
  startFlight: () => void;
  landFlight: () => void;
  setSpeedMultiplier: (multiplier: number) => void;
  toggleDevChrome: () => void;
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
  devChromeHidden: false,

  setPhase: (phase) => set({ phase }),
  setDeparture: (airport) => {
    track('departures_viewed', {
      airport: airport.iata,
      airport_city: airport.city,
      airport_country: airport.country,
    });
    set({ departure: airport, phase: 'departures' });
  },
  selectFlight: (departure, flight, source = 'departures_board') => {
    track('flight_selected', {
      ...routeProps(departure, flight.destination, flight.durationMinutes),
      airline: flight.airline,
      aircraft: flight.aircraft,
      is_real_route: flight.isReal,
      source,
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
    const { departure, destination, durationMinutes, flightInfo } = get();
    track('flight_started', {
      ...routeProps(departure, destination, durationMinutes),
      airline: flightInfo?.airline,
    });
    set({ startTime: Date.now(), phase: 'tracker' });
  },
  landFlight: () => {
    const { departure, destination, durationMinutes, flightInfo } = get();
    track('flight_completed', {
      ...routeProps(departure, destination, durationMinutes),
      airline: flightInfo?.airline,
    });
    set({ phase: 'landed' });
  },
  setSpeedMultiplier: (multiplier) => {
    // Rebase startTime so virtual elapsed time is continuous across the
    // change — otherwise the new multiplier applies retroactively to all
    // wall time and the plane teleports.
    const { startTime, speedMultiplier } = get();
    if (startTime !== null && multiplier !== speedMultiplier) {
      const now = Date.now();
      const virtualElapsed = (now - startTime) * speedMultiplier;
      set({ startTime: now - virtualElapsed / multiplier, speedMultiplier: multiplier });
    } else {
      set({ speedMultiplier: multiplier });
    }
  },
  // Deliberately survives reset() so multi-take recordings stay clean
  toggleDevChrome: () => set((s) => ({ devChromeHidden: !s.devChromeHidden })),
  reset: () => {
    const { phase, departure, destination, durationMinutes, startTime } = get();
    if (phase === 'tracker' && startTime) {
      track('flight_abandoned', {
        ...routeProps(departure, destination, durationMinutes),
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
