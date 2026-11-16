import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readActiveFlight, saveActiveFlight, clearActiveFlight, parseActiveFlight, flightElapsed } from '../src/lib/activeFlight';

const memory = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
  removeItem: (key: string) => memory.delete(key),
} });
const { useFlightStore: store } = await import('../src/store/flightStore');
const { useAuthStore: auth } = await import('../src/store/authStore');
const { findAirportByIata } = await import('../src/data/airports');
const originalNow = Date.now;
let now = new Date('2026-11-16T12:00:00Z').getTime();
Date.now = () => now;
const info = { airline: 'CloudAir', flightNumber: 'CL100', aircraft: 'A320', seat: '12A', gate: 'A1', seatClass: 'Economy', passengerName: 'Test Traveler', terminal: '1' };
function setup() {
  memory.clear();
  now = new Date('2026-11-16T12:00:00Z').getTime();
  auth.setState({ user: null, ready: true });
  store.setState({ phase: 'boarding', departure: findAirportByIata('JFK')!, destination: findAirportByIata('BOS')!, durationMinutes: 60, flightInfo: info, sessionId: null, sessionOwner: null, savedFlight: null, startTime: null, completedAt: null, speedMultiplier: 1, challengeEligible: false });
  store.getState().startFlight();
}
function unload() {
  store.setState({ phase: 'landing', sessionOwner: null, sessionId: null, startTime: null, departure: null, destination: null, flightInfo: null, savedFlight: null });
  store.getState().loadSavedFlight('guest');
}
test('refresh recovery preserves the original route, start, and session ID', () => {
  setup();
  const started = store.getState().startTime;
  const id = store.getState().sessionId;
  now += 30 * 60000;
  unload();
  assert.equal(store.getState().savedFlight?.sessionId, id);
  store.getState().resumeSavedFlight();
  assert.equal(store.getState().startTime, started);
  assert.equal(store.getState().departure?.iata, 'JFK');
  assert.equal(store.getState().destination?.iata, 'BOS');
  assert.equal(store.getState().sessionId, id);
  assert.equal(flightElapsed(started!, 60).remaining, 30 * 60000);
});
test('saving and returning does not abandon or replace the flight', () => {
  setup();
  const id = store.getState().sessionId;
  store.getState().suspendFlight();
  assert.equal(store.getState().phase, 'landing');
  assert.equal(readActiveFlight('guest')?.sessionId, id);
  store.getState().resumeSavedFlight();
  assert.equal(store.getState().phase, 'tracker');
  assert.equal(store.getState().sessionId, id);
});
test('flight completed while away keeps its actual scheduled completion time', () => {
  setup();
  const started = store.getState().startTime!;
  now += 2 * 60 * 60000;
  unload(); store.getState().resumeSavedFlight(); store.getState().landFlight();
  assert.equal(store.getState().completedAt, started + 60 * 60000);
  assert.equal(readActiveFlight('guest')?.phase, 'landed');
  const id = store.getState().sessionId;
  store.getState().landFlight();
  assert.equal(store.getState().sessionId, id);
  unload(); store.getState().resumeSavedFlight();
  assert.equal(store.getState().phase, 'landed');
});
test('ending a flight clears recovery; discarded records cannot resume', () => {
  setup(); store.getState().reset();
  assert.equal(readActiveFlight('guest'), null);
  unload(); assert.equal(store.getState().savedFlight, null);
  setup(); store.getState().suspendFlight(); store.getState().discardSavedFlight();
  assert.equal(readActiveFlight('guest'), null);
});
test('a different account cannot restore the guest flight', () => {
  setup();
  const guest = readActiveFlight('guest')!;
  assert.equal(parseActiveFlight(guest, 'other-account'), null);
  store.getState().loadSavedFlight('other-account');
  assert.equal(store.getState().phase, 'landing');
  assert.equal(store.getState().savedFlight, null);
  assert.equal(readActiveFlight('guest')?.sessionId, guest.sessionId);
});
test('corrupt or invalid recovery records fail closed', () => {
  setup(); const valid = readActiveFlight('guest')!;
  assert.equal(parseActiveFlight({ ...valid, durationMinutes: -1 }, 'guest'), null);
  assert.equal(parseActiveFlight({ ...valid, departure: { ...valid.departure, iata: '<b>' } }, 'guest'), null);
  assert.equal(parseActiveFlight({ ...valid, speedMultiplier: 0 }, 'guest'), null);
  memory.set('focusflight-active-flight-v1:guest', '{bad json');
  assert.equal(readActiveFlight('guest'), null);
});
test('stale tab cannot erase or overwrite a newer session', () => {
  setup(); const older = readActiveFlight('guest')!;
  const newer = { ...older, startTime: older.startTime + 1000, sessionId: crypto.randomUUID() };
  assert.equal(saveActiveFlight(newer), true);
  clearActiveFlight('guest', older.sessionId);
  assert.equal(saveActiveFlight(older), false);
  assert.equal(readActiveFlight('guest')?.sessionId, newer.sessionId);
});
test('clock setbacks clamp progress to zero instead of producing negative time', () => {
  assert.deepEqual(flightElapsed(1000, 1, 1, 0), { elapsed: 0, remaining: 60000, progress: 0 });
});
test('speed changes keep virtual elapsed time continuous and remain ineligible for challenge recovery', () => {
  setup(); now += 10 * 60000;
  store.getState().setSpeedMultiplier(10);
  assert.equal(flightElapsed(store.getState().startTime!, 60, 10).elapsed, 10 * 60000);
  assert.equal(readActiveFlight('guest')?.challengeEligible, false);
  store.getState().setSpeedMultiplier(1);
  assert.equal(readActiveFlight('guest')?.challengeEligible, false);
});
test.after(() => { Date.now = originalNow; });
