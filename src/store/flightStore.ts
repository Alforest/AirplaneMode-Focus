import { useAuthStore } from './authStore';
import { useHistoryStore } from './historyStore';
import { useWeeklyGoalStore } from './weeklyGoalStore';
import { create } from 'zustand';
import { registerChallengeFlight, completeChallengeFlight, invalidateChallengeFlight, forgetChallengeFlight } from '../lib/challenge';
import { Airport } from '../data/airports';
import { FlightInfo, buildFlightInfo } from '../utils/generateFlightInfo';
import { BoardFlight } from '../utils/departureBoard';
import { track, routeProps } from '../lib/analytics';

function engagementProps() {
  const owner = useHistoryStore.getState().owner;
  const goal = useWeeklyGoalStore.getState().goals[owner];
  return { signed_in: !!useAuthStore.getState().user, has_weekly_goal: !!goal, goal_minutes: goal ?? null };
}

export type Phase = 'landing' | 'departures' | 'boarding' | 'tracker' | 'landed';

interface FlightState {
  phase: Phase;
  departure: Airport | null;
  destination: Airport | null;
  boardFlight: BoardFlight | null;
  durationMinutes: number;
  startTime: number | null;
  sessionId: string | null;
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
  sessionId: null,
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
      ...engagementProps(),
      ...routeProps(departure, destination, durationMinutes),
      airline: flightInfo?.airline,
    });
    const sessionId = crypto.randomUUID();
    set({ startTime: Date.now(), sessionId, phase: 'tracker' });
    if (get().speedMultiplier === 1) registerChallengeFlight(sessionId, durationMinutes);
  },
  landFlight: () => {
    if (get().phase !== 'tracker') return;
    const { departure, destination, durationMinutes, flightInfo } = get();
    track('flight_completed', {
      ...engagementProps(),
      ...routeProps(departure, destination, durationMinutes),
      airline: flightInfo?.airline,
    });
    const { sessionId, speedMultiplier } = get();
    set({ phase: 'landed' });
    if (sessionId && speedMultiplier === 1) void completeChallengeFlight(sessionId);
  },
  setSpeedMultiplier: (multiplier) => {
    const id = get().sessionId;
    if (id && multiplier !== 1) invalidateChallengeFlight(id);
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
    const { phase, departure, destination, durationMinutes, startTime, sessionId } = get();
    if (sessionId && phase !== 'landed') forgetChallengeFlight(sessionId);
    if (phase === 'tracker' && startTime) {
      track('flight_abandoned', {
        ...engagementProps(),
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
      sessionId: null,
      flightInfo: null,
      speedMultiplier: 1,
    });
  },
}));
