import { ActiveFlight, readActiveFlight, saveActiveFlight, clearActiveFlight, markActiveChallenge, flightElapsed } from '../lib/activeFlight';
import { useAuthStore } from './authStore';
import { useHistoryStore } from './historyStore';
import { useWeeklyGoalStore } from './weeklyGoalStore';
import { create } from 'zustand';
import { registerChallengeFlight, completeChallengeFlight, invalidateChallengeFlight, forgetChallengeFlight, restoreChallengeFlight } from '../lib/challenge';
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
  sessionOwner: string | null;
  completedAt: number | null;
  challengeEligible: boolean;
  savedFlight: ActiveFlight | null;
  recoveryAvailable: boolean;
  loadSavedFlight: (owner: string) => void;
  resumeSavedFlight: () => void;
  suspendFlight: () => void;
  discardSavedFlight: () => void;
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
  sessionOwner: null,
  completedAt: null,
  challengeEligible: false,
  savedFlight: null,
  recoveryAvailable: true,
  loadSavedFlight: owner => {
    const state = get();
    if (state.sessionOwner === owner && (state.phase === 'tracker' || state.phase === 'landed')) return;
    const savedFlight = readActiveFlight(owner);
    if (state.sessionOwner && state.sessionOwner !== owner) {
      set({ phase: 'landing', departure: null, destination: null, flightInfo: null, sessionId: null, startTime: null, sessionOwner: null, completedAt: null, challengeEligible: false, speedMultiplier: 1, savedFlight });
    } else set({ savedFlight });
  },
  resumeSavedFlight: () => {
    const saved = get().savedFlight;
    const owner = useAuthStore.getState().user?.id ?? 'guest';
    if (!saved || !useAuthStore.getState().ready || saved.owner !== owner) return;
    // Re-read so an ended/replaced flight in another tab cannot be resurrected.
    const current = readActiveFlight(owner);
    if (!current || current.sessionId !== saved.sessionId) { set({ savedFlight: current }); return; }
    restoreChallengeFlight(current.sessionId, owner, current.challengeEligible);
    set({ phase: current.phase, departure: current.departure, destination: current.destination, flightInfo: current.flightInfo, durationMinutes: current.durationMinutes, startTime: current.startTime, speedMultiplier: current.speedMultiplier, sessionId: current.sessionId, sessionOwner: owner, completedAt: current.completedAt, challengeEligible: current.challengeEligible, savedFlight: null });
    track('flight_resumed', { ...engagementProps(), elapsed_minutes: Math.floor(flightElapsed(current.startTime, current.durationMinutes, current.speedMultiplier).elapsed / 60000) });
    if (current.phase === 'landed' && current.challengeEligible) void completeChallengeFlight(current.sessionId);
  },
  suspendFlight: () => {
    const state = get();
    if (state.phase !== 'tracker' || !state.sessionOwner) return;
    const savedFlight = readActiveFlight(state.sessionOwner);
    if (!savedFlight || savedFlight.sessionId !== state.sessionId) { set({ recoveryAvailable: false }); return; }
    track('flight_saved_for_later', { ...engagementProps() });
    set({ phase: 'landing', departure: null, destination: null, flightInfo: null, sessionId: null, startTime: null, sessionOwner: null, savedFlight });
  },
  discardSavedFlight: () => {
    const saved = get().savedFlight;
    if (!saved) return;
    clearActiveFlight(saved.owner, saved.sessionId);
    forgetChallengeFlight(saved.sessionId);
    set({ savedFlight: null });
    track(saved.phase === 'landed' ? 'flight_recovery_dismissed' : 'flight_abandoned', { ...engagementProps(), via: 'discard_recovery' });
  },
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
    if (get().phase !== 'boarding') return;
    const { departure, destination, durationMinutes, flightInfo } = get();
    track('flight_started', {
      ...engagementProps(),
      ...routeProps(departure, destination, durationMinutes),
      airline: flightInfo?.airline,
    });
    const previous = get().savedFlight;
    if (previous) { clearActiveFlight(previous.owner, previous.sessionId); forgetChallengeFlight(previous.sessionId); }
    const sessionId = crypto.randomUUID();
    const sessionOwner = useAuthStore.getState().user?.id ?? 'guest';
    set({ startTime: Date.now(), sessionId, sessionOwner, savedFlight: null, completedAt: null, challengeEligible: false, phase: 'tracker' });
    if (get().speedMultiplier === 1) registerChallengeFlight(sessionId, durationMinutes, () => {
      const state = get();
      if (state.sessionId === sessionId && state.sessionOwner === sessionOwner) set({ challengeEligible: true });
      else markActiveChallenge(sessionOwner, sessionId);
    });
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
    const { startTime } = get();
    const completedAt = startTime ? Math.min(Date.now(), startTime + durationMinutes * 60000 / speedMultiplier) : Date.now();
    set({ phase: 'landed', completedAt });
    if (sessionId && speedMultiplier === 1) void completeChallengeFlight(sessionId);
  },
  setSpeedMultiplier: (multiplier) => {
    const id = get().sessionId;
    if (id && multiplier !== 1) { invalidateChallengeFlight(id); set({ challengeEligible: false }); }
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
    if (sessionId && get().sessionOwner) clearActiveFlight(get().sessionOwner!, sessionId);
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
      sessionOwner: null,
      completedAt: null,
      challengeEligible: false,
      savedFlight: null,
    });
  },
}));


// Persist only state transitions, never animation frames. Account-owned snapshots
// stay on this device and are only offered after that same identity is restored.
useFlightStore.subscribe(state => {
  if ((state.phase !== 'tracker' && state.phase !== 'landed') || !state.sessionOwner || !state.sessionId || !state.startTime || !state.departure || !state.destination || !state.flightInfo) return;
  const saved = saveActiveFlight({ version: 1, owner: state.sessionOwner, sessionId: state.sessionId, departure: state.departure, destination: state.destination, durationMinutes: state.durationMinutes, startTime: state.startTime, speedMultiplier: state.speedMultiplier, flightInfo: state.flightInfo, phase: state.phase, completedAt: state.completedAt, challengeEligible: state.challengeEligible });
  if (state.recoveryAvailable !== saved) useFlightStore.setState({ recoveryAvailable: saved });
});
