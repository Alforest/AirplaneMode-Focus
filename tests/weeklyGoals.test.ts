import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CompletedFlight } from '../src/types/history';
import { landingRewards } from '../src/utils/landingRewards';

const memory = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
} });
// Invalid values left by old/corrupt storage must never become goals.
memory.set('focusflight-weekly-goals-v1', JSON.stringify({ guest: 300, bad: -30, infinite: 'Infinity' }));
const { useWeeklyGoalStore: store, validWeeklyGoal } = await import('../src/store/weeklyGoalStore');
function flight(id: string, day: number, minutes = 60, country = 'UK'): CompletedFlight {
  return { id, durationMinutes: minutes, date: new Date(2026, 10, day, 12).toISOString(), distanceKm: 1000,
    departure: { iata: 'JFK', city: 'New York', country: 'US', lat: 40, lon: -73 },
    destination: { iata: 'LHR', city: 'London', country, lat: 51, lon: 0 }, flightNumber: 'CL100', airline: 'CloudAir' };
}
test('loads valid saved goals and ignores invalid entries', () => {
  assert.deepEqual(store.getState().goals, { guest: 300 });
});
test('goals are isolated by owner and persist without moving guest preferences', () => {
  assert.equal(store.getState().save('account-a', 120), true);
  assert.equal(store.getState().save('account-b', 600), true);
  assert.equal(store.getState().goals.guest, 300);
  assert.equal(store.getState().goals['account-a'], 120);
  assert.equal(store.getState().goals['account-b'], 600);
  assert.equal(JSON.parse(memory.get('focusflight-weekly-goals-v2')!).goals['account-a'], 120);
  assert.equal(store.getState().save('account-a', null), true);
  assert.equal(store.getState().goals['account-a'], undefined);
  assert.equal(store.getState().goals['account-b'], 600);
});
test('goal boundaries are whole half-hours within a week', () => {
  for (const minutes of [0, -30, 45, 10081, NaN, Infinity]) assert.equal(validWeeklyGoal(minutes), false);
  for (const minutes of [30, 300, 10080]) assert.equal(validWeeklyGoal(minutes), true);
  assert.equal(store.getState().save('account-b', -30), false);
  assert.equal(store.getState().goals['account-b'], 600);
});
test('goal reward triggers only when this flight crosses target', () => {
  const previous = [flight('a', 16, 60)];
  const landing = flight('b', 17, 60);
  assert.ok(landingRewards(previous, landing, 120).some(r => r.id === 'weekly-goal'));
  assert.ok(!landingRewards(previous, landing, 60).some(r => r.id === 'weekly-goal'));
  assert.ok(!landingRewards(previous, landing, 300).some(r => r.id === 'weekly-goal'));
});
test('prior week time cannot trigger a current week goal', () => {
  assert.ok(!landingRewards([flight('a', 15, 120)], flight('b', 16, 60), 120).some(r => r.id === 'weekly-goal'));
});
test('saving current flight before rendering rewards cannot double count it', () => {
  const previous = [flight('a', 16, 60)];
  const landing = flight('b', 17, 60);
  assert.deepEqual(landingRewards([...previous, landing], landing, 120), landingRewards(previous, landing, 120));
});
test('personal best requires a strictly longer flight', () => {
  assert.ok(!landingRewards([flight('a', 16, 60)], flight('b', 17, 60), null).some(r => r.id === 'longest-session'));
  assert.ok(landingRewards([flight('a', 16, 60)], flight('b', 17, 90), null).some(r => r.id === 'longest-session'));
});
test('first flight and a genuinely new country get milestones', () => {
  assert.ok(landingRewards([], flight('a', 16), null).some(r => r.id === 'first-flight'));
  assert.ok(landingRewards([flight('a', 16)], flight('b', 17, 60, 'Japan'), null).some(r => r.id === 'new-country'));
  assert.ok(!landingRewards([flight('a', 16)], flight('b', 17), null).some(r => r.id === 'new-country'));
});
test('only extending the streak earns a streak reward', () => {
  assert.ok(landingRewards([flight('a', 16)], flight('b', 17), null).some(r => r.id === 'streak'));
  assert.ok(!landingRewards([flight('a', 16)], flight('b', 16), null).some(r => r.id === 'streak'));
});

function resetCloud(goals: Record<string, number> = {}) {
  store.setState({ goals, pending: {}, revisions: {}, status: {} });
}
test('legacy account goal migrates only if cloud has no row; guest stays local', async () => {
  resetCloud({ 'account-a': 300, guest: 120 });
  let written: number | null = null;
  await store.getState().sync('account-a', {
    read: async () => null,
    write: async minutes => { written = minutes; return { applied: true, goal_minutes: minutes, revision: 'r1' }; },
  }, () => true);
  assert.equal(written, 300);
  assert.equal(store.getState().status['account-a'], 'synced');
  assert.equal(store.getState().goals.guest, 120);
});
test('cloud removal marker overrides an old local goal', async () => {
  resetCloud({ 'account-a': 300 });
  await store.getState().sync('account-a', {
    read: async () => ({ goal_minutes: null, revision: 'removed' }),
    write: async () => { throw new Error('Must not resurrect'); },
  }, () => true);
  assert.equal(store.getState().goals['account-a'], undefined);
  assert.equal(store.getState().revisions['account-a'], 'removed');
});
test('pending saves survive failures and can retry successfully', async () => {
  resetCloud();
  store.getState().save('account-a', 300);
  await store.getState().sync('account-a', { read: async () => { throw new Error('offline'); }, write: async () => { throw new Error('offline'); } }, () => true);
  assert.equal(store.getState().status['account-a'], 'error');
  assert.equal(store.getState().pending['account-a'].minutes, 300);
  assert.equal(JSON.parse(memory.get('focusflight-weekly-goals-v2')!).pending['account-a'].minutes, 300);
  await store.getState().sync('account-a', { read: async () => null, write: async minutes => ({ applied: true, goal_minutes: minutes, revision: 'r1' }) }, () => true);
  assert.equal(store.getState().pending['account-a'], undefined);
  assert.equal(store.getState().goals['account-a'], 300);
});
test('conflicting offline edit cannot overwrite newer cloud goal', async () => {
  resetCloud({ 'account-a': 300 });
  store.setState({ revisions: { 'account-a': 'old' } });
  store.getState().save('account-a', 120);
  await store.getState().sync('account-a', {
    read: async () => ({ goal_minutes: 600, revision: 'new' }),
    write: async (_, expected) => { assert.equal(expected, 'old'); return { applied: false, goal_minutes: 600, revision: 'new' }; },
  }, () => true);
  assert.equal(store.getState().goals['account-a'], 600);
  assert.equal(store.getState().pending['account-a'], undefined);
  assert.equal(store.getState().status['account-a'], 'conflict');
});
test('newer local edits made during an upload are rebased and saved next', async () => {
  resetCloud();
  store.getState().save('account-a', 120);
  const sent: Array<number | null> = [];
  await store.getState().sync('account-a', {
    read: async () => null,
    write: async (minutes, expected) => {
      sent.push(minutes);
      if (sent.length === 1) store.getState().save('account-a', 300);
      else assert.equal(expected, 'r1');
      return { applied: true, goal_minutes: minutes, revision: `r${sent.length}` };
    },
  }, () => true);
  assert.deepEqual(sent, [120, 300]);
  assert.equal(store.getState().goals['account-a'], 300);
  assert.equal(store.getState().pending['account-a'], undefined);
});
test('late response after account switch cannot overwrite local pending state', async () => {
  resetCloud();
  store.getState().save('account-a', 120);
  let current = true;
  await store.getState().sync('account-a', {
    read: async () => { current = false; return { goal_minutes: 600, revision: 'r1' }; },
    write: async () => { throw new Error('Must not upload after account switch'); },
  }, () => current);
  assert.equal(store.getState().goals['account-a'], 120);
  assert.ok(store.getState().pending['account-a']);
});
test('removing account goal uploads a null record rather than deleting cloud history', async () => {
  resetCloud({ 'account-a': 120 });
  store.setState({ revisions: { 'account-a': 'old' } });
  store.getState().save('account-a', null);
  await store.getState().sync('account-a', {
    read: async () => ({ goal_minutes: 120, revision: 'old' }),
    write: async minutes => { assert.equal(minutes, null); return { applied: true, goal_minutes: null, revision: 'removed' }; },
  }, () => true);
  assert.equal(store.getState().goals['account-a'], undefined);
  assert.equal(store.getState().revisions['account-a'], 'removed');
});

test('lost successful response resolves as synced when the cloud already has the requested value', async () => {
  resetCloud();
  store.getState().save('account-a', 120);
  await store.getState().sync('account-a', {
    read: async () => ({ goal_minutes: 120, revision: 'saved' }),
    write: async () => ({ applied: false, goal_minutes: 120, revision: 'saved' }),
  }, () => true);
  assert.equal(store.getState().status['account-a'], 'synced');
  assert.equal(store.getState().pending['account-a'], undefined);
});
