import { test } from 'node:test';
import assert from 'node:assert/strict';

const memory = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
  removeItem: (key: string) => memory.delete(key),
} });
// Seed the old version to exercise real persist middleware migration on import.
const flight = {
  id: '10000000-0000-4000-8000-000000000001',
  departure: { iata: 'JFK', city: 'New York', country: 'US', lat: 40, lon: -73 },
  destination: { iata: 'BOS', city: 'Boston', country: 'US', lat: 42, lon: -71 },
  durationMinutes: 60, distanceKm: 300, date: '2026-11-14T12:00:00.000Z',
  flightNumber: 'CL100', airline: 'CloudAir',
};
memory.set('airplane-mode-history', JSON.stringify({ state: { flights: [flight] }, version: 0 }));
const { useHistoryStore: store } = await import('../src/store/historyStore');

test('migrates existing guest history without loss', () => {
  assert.equal(store.getState().flights[0].id, flight.id);
  assert.equal(store.getState().buckets.guest[flight.id].pending, true);
});

// Each remaining test resets explicitly, keeping the migration assertion intact.
function reset() { store.setState({ owner: 'guest', buckets: {}, flights: [] }); }

test('isolates guest and account caches and deduplicates imports', () => {
  reset();
  store.getState().addFlight(flight);
  store.getState().setOwner('account-a');
  assert.equal(store.getState().flights.length, 0);
  store.getState().importGuest();
  store.getState().importGuest();
  assert.equal(store.getState().flights.length, 1);
  store.getState().setOwner('account-b');
  assert.equal(store.getState().flights.length, 0);
  store.getState().setOwner(null);
  assert.equal(store.getState().flights.length, 0);
  store.getState().setOwner('account-a');
  assert.equal(store.getState().flights.length, 1);
});

test('clear while an upload is in flight retains its pending deletion', () => {
  reset();
  store.getState().setOwner('account-a');
  store.getState().addFlight(flight);
  const upload = store.getState().buckets['account-a'][flight.id];
  store.getState().clearHistory();
  store.getState().acknowledge('account-a', [upload]);
  const current = store.getState().buckets['account-a'][flight.id];
  assert.equal(current.pending, true);
  assert.equal(current.deleted, true);
  assert.equal(store.getState().flights.length, 0);
});

test('remote deletion wins over stale pending upload', () => {
  reset();
  store.getState().setOwner('account-a');
  store.getState().addFlight(flight);
  store.getState().mergeCloud('account-a', [{ flight, deleted: true, pending: false, revision: 'cloud' }]);
  assert.equal(store.getState().flights.length, 0);
  assert.equal(store.getState().buckets['account-a'][flight.id].pending, false);
});

test('remote nondeleted rows do not undo a pending local deletion', () => {
  reset();
  store.getState().setOwner('account-a');
  store.getState().addFlight(flight);
  store.getState().clearHistory();
  store.getState().mergeCloud('account-a', [{ flight, deleted: false, pending: false, revision: 'cloud' }]);
  assert.equal(store.getState().flights.length, 0);
  assert.equal(store.getState().buckets['account-a'][flight.id].deleted, true);
});

test('late account response cannot display another account history', () => {
  reset();
  store.getState().setOwner('account-b');
  store.getState().mergeCloud('account-a', [{ flight, deleted: false, pending: false, revision: 'cloud' }]);
  assert.equal(store.getState().owner, 'account-b');
  assert.equal(store.getState().flights.length, 0);
});

test('reload restores pending writes but starts with the guest view', async () => {
  reset();
  store.getState().setOwner('account-a');
  store.getState().addFlight(flight);
  store.getState().setOwner(null);
  await store.persist.rehydrate();
  assert.equal(store.getState().owner, 'guest');
  assert.equal(store.getState().flights.length, 0);
  assert.equal(store.getState().buckets['account-a'][flight.id].pending, true);
});


test('saving a completed session twice keeps one flight', () => {
  reset();
  store.getState().addFlight(flight);
  store.getState().addFlight(flight);
  assert.equal(store.getState().flights.length, 1);
});
